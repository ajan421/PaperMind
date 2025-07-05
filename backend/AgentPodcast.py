from pydantic import BaseModel, ValidationError
from typing import List, Literal, Optional
from dotenv import load_dotenv
import os
import json
from pathlib import Path
import fitz  # PyMuPDF
from openai import OpenAI, APIConnectionError, RateLimitError, APIStatusError
from pydub import AudioSegment
import azure.cognitiveservices.speech as speechsdk
import io
import concurrent.futures
import time
import asyncio
import aiohttp
import threading
from functools import lru_cache
import logging
from contextlib import contextmanager

from pdf_utils import get_research_paper_text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# --- FFMPEG Configuration for Pydub ---
ffmpeg_path = os.path.join(os.path.dirname(__file__), 'bin', 'ffmpeg.exe')
if os.path.exists(ffmpeg_path):
    AudioSegment.converter = ffmpeg_path
    logger.info(f"Using ffmpeg from: {ffmpeg_path}")
else:
    logger.warning("ffmpeg.exe not found in 'bin' directory. Audio export may fail.")

# Initialize OpenAI client with connection pooling
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

client = OpenAI(
    api_key=OPENAI_API_KEY,
    max_retries=3,
    timeout=30.0
)

# Azure Speech configuration
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "eastasia")
if not AZURE_SPEECH_KEY:
    raise ValueError("AZURE_SPEECH_KEY not found in environment variables")

# Optimized configuration
AZURE_CONCURRENT_LIMIT = 5  # Increased from 3
AZURE_RETRY_LIMIT = 3       # Reduced from 5
AZURE_BACKOFF_MAX = 30      # Reduced from 60
OPENAI_RETRY_LIMIT = 2      # Reduced from 3

# Connection pool for Azure Speech
speech_config_pool = threading.local()

def get_speech_config():
    """Get thread-local speech config to avoid repeated initialization."""
    if not hasattr(speech_config_pool, 'config'):
        speech_config_pool.config = speechsdk.SpeechConfig(
            subscription=AZURE_SPEECH_KEY, 
            region=AZURE_SPEECH_REGION
        )
    return speech_config_pool.config

class LineItem(BaseModel):
    """A single line in the script."""
    speaker: Literal["Host (Jane)", "Guest"]
    text: str

class Script(BaseModel):
    """The script between the host and guest."""
    scratchpad: str
    name_of_guest: str
    script: List[LineItem]

class PodcastConfig(BaseModel):
    """Configuration for podcast generation."""
    user_id: str
    task_id: Optional[str] = None
    pdf_file: str = "source.pdf"
    output_dir: str = "output"
    auto_generate_audio: bool = True
    max_workers: int = 5  # Increased from 4
    pause_duration: int = 500  # Reduced from 750ms
    chunk_size: int = 10  # Process audio in chunks
    enable_caching: bool = True
    compress_audio: bool = True

@lru_cache(maxsize=1)
def load_prompt(filename: str) -> str:
    """Load prompt from file with caching."""
    try:
        with open(f"prompts/{filename}", "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        logger.warning(f"Prompt file {filename} not found. Using default prompt.")
        return """You are an expert podcast script generator. Create an engaging conversation between a host named Jane and a guest expert discussing the research paper. 
        Make it conversational, informative, and accessible to a general audience. The host should ask insightful questions and the guest should provide clear explanations."""

SYSTEM_PROMPT = load_prompt("SYSTEM_PROMPT.txt")

@contextmanager
def timer(description: str):
    """Context manager to time operations."""
    start = time.time()
    try:
        yield
    finally:
        elapsed = time.time() - start
        logger.info(f"{description}: {elapsed:.2f}s")

def call_openai_llm(system_prompt: str, text: str, dialogue_format):
    """Optimized OpenAI API call with reduced retries."""
    schema_prompt = (
        f"Generate a podcast script in JSON format matching this schema:\n"
        f"{json.dumps(dialogue_format.model_json_schema(), indent=2)}\n\n"
        f"Content:\n{text[:8000]}"  # Truncate very long content
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": schema_prompt},
    ]
    
    for attempt in range(OPENAI_RETRY_LIMIT):
        try:
            with timer(f"OpenAI API call (attempt {attempt + 1})"):
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=4000,  # Limit response size
                )
                return response.choices[0].message.content
        except (APIConnectionError, RateLimitError, APIStatusError) as e:
            if attempt == OPENAI_RETRY_LIMIT - 1:
                raise RuntimeError(f"OpenAI API failed after {OPENAI_RETRY_LIMIT} attempts: {e}") from e
            wait_time = min(2 ** attempt, 10)
            logger.warning(f"OpenAI API error (attempt {attempt + 1}): {e}. Retrying in {wait_time}s...")
            time.sleep(wait_time)
        except Exception as e:
            logger.error(f"Unexpected OpenAI API error: {e}")
            raise RuntimeError(f"Unexpected OpenAI API error: {e}") from e

def generate_script(system_prompt: str, input_text: str, output_model):
    """Generate script with optimized error handling."""
    def clean_json_content(content: str) -> str:
        """Clean and extract JSON content."""
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:].strip()
        if content.startswith("```"):
            content = content[3:].strip()
        if content.endswith("```"):
            content = content[:-3].strip()
        return content
    
    try:
        with timer("Script generation"):
            raw = call_openai_llm(system_prompt, input_text, output_model)
            content = clean_json_content(raw)
            return output_model.model_validate_json(content)
    except ValidationError as e:
        logger.warning(f"JSON validation error: {e}. Retrying with explicit instructions...")
        retry_system = f"{system_prompt}\n\nIMPORTANT: Return ONLY valid JSON. Previous error: {str(e)[:200]}"
        raw = call_openai_llm(retry_system, input_text, output_model)
        content = clean_json_content(raw)
        return output_model.model_validate_json(content)

def save_script(script: Script, output_file: str):
    """Save script to file."""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(script.model_dump(), f, indent=2, ensure_ascii=False)
    logger.info(f"Script saved to {output_file}")
    return output_file

def generate_speech_segment_optimized(line_data):
    """Optimized speech generation with connection reuse."""
    speaker = line_data["speaker"]
    text = line_data["text"]
    line_index = line_data["index"]
    
    # Use thread-local speech config
    speech_config = get_speech_config()
    
    # Set voice based on speaker
    voice_map = {
        "Host (Jane)": "en-US-JennyNeural",
        "Guest": "en-US-GuyNeural"
    }
    speech_config.speech_synthesis_voice_name = voice_map.get(speaker, "en-US-GuyNeural")
    
    # Use in-memory stream
    stream = speechsdk.audio.PullAudioOutputStream()
    audio_config = speechsdk.audio.AudioOutputConfig(stream=stream)
    
    for attempt in range(AZURE_RETRY_LIMIT):
        try:
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=speech_config,
                audio_config=audio_config
            )
            
            result = synthesizer.speak_text_async(text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                audio_data = result.audio_data
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_data), format="wav")
                return {"index": line_index, "audio": audio_segment, "success": True}
            else:
                error_msg = f"Speech synthesis failed for line {line_index + 1}"
                if hasattr(result, 'cancellation_details'):
                    error_msg += f": {result.cancellation_details.reason}"
                logger.warning(error_msg)
                
                if attempt < AZURE_RETRY_LIMIT - 1:
                    wait_time = min(2 ** attempt, AZURE_BACKOFF_MAX)
                    time.sleep(wait_time)
                    continue
                
                return {"index": line_index, "audio": None, "success": False}
                
        except Exception as e:
            if attempt < AZURE_RETRY_LIMIT - 1:
                wait_time = min(2 ** attempt, 10)
                logger.warning(f"Speech generation error for line {line_index + 1} (attempt {attempt + 1}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            
            logger.error(f"Speech generation failed for line {line_index + 1}: {e}")
            return {"index": line_index, "audio": None, "success": False}
    
    return {"index": line_index, "audio": None, "success": False}

def create_podcast_audio_parallel(script_data, output_file="final_podcast.mp3", max_workers=4, pause_duration=750):
    """Legacy wrapper for backward compatibility."""
    config = PodcastConfig(
        user_id="legacy",
        max_workers=max_workers,
        pause_duration=pause_duration
    )
    return create_podcast_audio_optimized(script_data, output_file, config)

def create_podcast_audio_optimized(script_data, output_file="final_podcast.mp3", config: PodcastConfig = None):
    """Optimized podcast audio creation with chunked processing."""
    if config is None:
        config = PodcastConfig(user_id="default")
    
    script_lines = script_data["script"]
    total_lines = len(script_lines)
    
    # Prepare data for parallel processing
    line_data = [
        {"speaker": line["speaker"], "text": line["text"], "index": i}
        for i, line in enumerate(script_lines)
    ]
    
    logger.info(f"Generating audio for {total_lines} lines using {config.max_workers} workers...")
    
    # Process in chunks to reduce memory usage
    chunk_size = config.chunk_size
    audio_results = []
    
    with timer("Audio generation"):
        # Use ThreadPoolExecutor with optimized settings
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=config.max_workers,
            thread_name_prefix="AudioGen"
        ) as executor:
            
            for chunk_start in range(0, len(line_data), chunk_size):
                chunk_end = min(chunk_start + chunk_size, len(line_data))
                chunk_data = line_data[chunk_start:chunk_end]
                
                logger.info(f"Processing chunk {chunk_start//chunk_size + 1}/{(len(line_data) + chunk_size - 1)//chunk_size}")
                
                # Submit chunk tasks
                future_to_line = {
                    executor.submit(generate_speech_segment_optimized, line): line 
                    for line in chunk_data
                }
                
                # Collect results for this chunk
                chunk_results = []
                for future in concurrent.futures.as_completed(future_to_line):
                    try:
                        result = future.result()
                        if result.get('success', False):
                            logger.info(f"  ✓ Generated line {result['index'] + 1}/{total_lines}")
                        else:
                            logger.warning(f"  ✗ Failed line {result['index'] + 1}/{total_lines}")
                        chunk_results.append(result)
                    except Exception as e:
                        logger.error(f"Chunk processing error: {e}")
                        # Continue with other tasks instead of failing completely
                        continue
                
                audio_results.extend(chunk_results)
    
    # Sort results by original index
    audio_results.sort(key=lambda x: x["index"])
    
    # Combine audio segments with progress tracking
    logger.info("Combining audio segments...")
    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=config.pause_duration)
    
    successful_segments = 0
    with timer("Audio combination"):
        for result in audio_results:
            if result.get("audio"):
                combined += result["audio"] + pause
                successful_segments += 1
    
    logger.info(f"Combined {successful_segments}/{total_lines} successful audio segments")
    
    # Export with compression if enabled
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    try:
        with timer("Audio export"):
            if config.compress_audio:
                # Export with compression settings
                combined.export(
                    output_file, 
                    format="mp3",
                    bitrate="128k",
                    parameters=["-ac", "1"]  # Mono for smaller file size
                )
            else:
                combined.export(output_file, format="mp3")
                
        logger.info(f"✓ Podcast audio generated: '{output_file}' ({successful_segments}/{total_lines} segments)")
        return output_file
        
    except FileNotFoundError:
        logger.error("ffmpeg.exe not found. Please install ffmpeg.")
        raise
    except Exception as e:
        logger.error(f"Audio export failed: {e}")
        raise

def process_pdf_to_podcast(config: PodcastConfig):
    """Optimized PDF processing with better error handling."""
    try:
        # Validate input
        if not os.path.exists(config.pdf_file):
            raise FileNotFoundError(f"PDF file not found: {config.pdf_file}")
        
        # Read PDF file
        with timer("PDF reading"):
            with open(config.pdf_file, "rb") as f:
                pdf_bytes = f.read()
            
            logger.info(f"PDF size: {len(pdf_bytes) / 1024:.1f} KB")
            pdf_text = get_research_paper_text(pdf_bytes)
            logger.info(f"Extracted text length: {len(pdf_text)} characters")
        
        # Generate script
        script = generate_script(SYSTEM_PROMPT, pdf_text, Script)
        
        # Save script
        script_file = os.path.join(config.output_dir, "podcast_script.json")
        save_script(script, script_file)
        
        # Generate audio if requested
        audio_file = None
        if config.auto_generate_audio:
            audio_file = os.path.join(config.output_dir, "podcast.mp3")
            create_podcast_audio_optimized(
                script.model_dump(),
                output_file=audio_file,
                config=config
            )
        
        logger.info("✓ Podcast generation completed successfully!")
        
        return {
            "script_file": os.path.abspath(script_file),
            "audio_file": os.path.abspath(audio_file) if audio_file else None,
            "lines_count": len(script.script),
            "guest_name": script.name_of_guest
        }
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise

def process_pdf_to_podcast_bytes(pdf_bytes: bytes, output_dir: str):
    """Legacy function for backward compatibility."""
    try:
        logger.info("Reading PDF content...")
        pdf_text = get_research_paper_text(pdf_bytes)
        
        logger.info("Generating podcast script...")
        script = generate_script(SYSTEM_PROMPT, pdf_text, Script)
        
        script_file = os.path.join(output_dir, "podcast_script.json")
        save_script(script, script_file)
        
        logger.info("Generating podcast audio...")
        audio_file = os.path.join(output_dir, "podcast.mp3")
        create_podcast_audio_parallel(
            script.model_dump(),
            output_file=audio_file
        )
        logger.info("✓ Podcast generated successfully!")
        
        return {
            "script_file": script_file,
            "audio_file": audio_file
        }
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise

def main():
    """Optimized main function."""
    pdf_file = "source.pdf"
    if not os.path.exists(pdf_file):
        logger.error(f"ERROR: The file '{pdf_file}' was not found.")
        return

    try:
        # Use optimized configuration
        config = PodcastConfig(
            user_id="local_user",
            pdf_file=pdf_file,
            output_dir="output",
            max_workers=5,
            pause_duration=500,
            chunk_size=8,
            compress_audio=True
        )
        
        result = process_pdf_to_podcast(config)
        logger.info(f"Generated podcast with {result['lines_count']} lines")
        logger.info(f"Guest: {result['guest_name']}")
        logger.info("Podcast generation completed successfully!")
        
    except Exception as e:
        logger.error(f"Error in podcast generation: {e}")

if __name__ == "__main__":
    main()

# FastAPI router for podcast generation
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Header
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel as FastAPIBaseModel
from typing import Optional as FastAPIOptional
import tempfile
import shutil

class PodcastGenerationResponse(FastAPIBaseModel):
    status: str
    audio_url: FastAPIOptional[str] = None
    script_file: FastAPIOptional[str] = None
    audio_file: FastAPIOptional[str] = None

podcast_router = APIRouter()

@podcast_router.post("/generate", 
          response_class=StreamingResponse,
          responses={
              200: {
                  "description": "Audio stream of the generated podcast",
                  "content": {"audio/mpeg": {}},
                  "headers": {
                      "Content-Type": {"description": "audio/mpeg"},
                      "Content-Disposition": {"description": "inline; filename=podcast.mp3"}
                  }
              }
          })
async def generate_podcast(
    pdf_file: UploadFile = File(..., description="PDF file to convert to podcast"),
    stream_audio: bool = Form(True, description="Stream audio directly (default: True)")
):
    """
    Generate a podcast from a PDF research paper.
    
    This endpoint will:
    1. Extract text from the uploaded PDF
    2. Generate a conversational script between a host and guest expert
    3. Convert the script to audio using Azure Speech Services
    4. Stream the audio directly to the client
    
    The audio is streamed as it's ready, allowing immediate playback in browsers and Swagger UI.
    """
    if not AZURE_SPEECH_KEY:
        raise HTTPException(status_code=500, detail="Azure Speech Service is not configured.")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(pdf_file.file, tmp)
            temp_path = Path(tmp.name)
        
        # Configure podcast generation
        config = PodcastConfig(
            user_id="api_user",
            pdf_file=str(temp_path),
            output_dir=str(Path(__file__).parent / "output"),
            auto_generate_audio=True,
            max_workers=5,
            pause_duration=500
        )
        
        # Generate podcast
        result = process_pdf_to_podcast(config)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        if not result or 'audio_file' not in result:
            raise HTTPException(status_code=500, detail="Failed to generate audio file")
        
        audio_path = Path(result['audio_file'])
        script_path = Path(result['script_file'])
        
        if not audio_path.is_file():
            raise HTTPException(status_code=500, detail=f"Generated audio file not found at {audio_path}")
        
        if stream_audio:
            # Stream the audio file
            file_size = os.stat(audio_path).st_size
            headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": "audio/mpeg",
                "Content-Disposition": f"inline; filename={audio_path.name}"
            }
            
            async def stream_generated_audio():
                with open(audio_path, "rb") as file:
                    while chunk := file.read(8192):
                        yield chunk
            
            return StreamingResponse(
                stream_generated_audio(),
                headers=headers,
                media_type="audio/mpeg"
            )
        else:
            # Return file information
            return PodcastGenerationResponse(
                status="success",
                script_file=str(script_path.name),
                audio_file=str(audio_path.name)
            )
    
    except Exception as e:
        error_msg = f"Failed to generate podcast: {str(e)}"
        logger.error(error_msg)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=error_msg)

@podcast_router.get("/stream/{filename}",
         response_class=StreamingResponse,
         responses={
             200: {
                 "description": "Audio stream with range support",
                 "content": {"audio/mpeg": {}},
             },
             206: {
                 "description": "Partial content (range request)",
                 "content": {"audio/mpeg": {}},
             }
         })
async def stream_audio(
    filename: str,
    request: Request = None,
    range: str = Header(None, description="HTTP Range header for partial content")
):
    """
    Stream an audio file with HTTP range support.
    
    This endpoint supports:
    - Full file streaming
    - Partial content requests (HTTP 206) for seeking
    - Browser audio player compatibility
    """
    output_dir = Path(__file__).parent / "output"
    file_path = output_dir / filename
    
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    file_size = os.stat(file_path).st_size
    start = 0
    end = file_size - 1
    content_length = file_size
    
    if range is not None and range != "":
        try:
            range_match = range.replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1
            content_length = end - start + 1
        except (IndexError, ValueError):
            raise HTTPException(status_code=416, detail="Invalid range header")
    
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache"
    }
    
    async def stream_file():
        with open(file_path, "rb") as file:
            file.seek(start)
            chunk_size = 8192
            remaining = content_length
            while remaining > 0:
                chunk = file.read(min(chunk_size, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
    
    status_code = 206 if range is not None and range != "" else 200
    return StreamingResponse(
        stream_file(),
        status_code=status_code,
        headers=headers
    )

@podcast_router.get("/test-stream",
         response_class=StreamingResponse,
         responses={
             200: {
                 "description": "Test audio stream",
                 "content": {"audio/mpeg": {}},
             }
         })
async def test_audio_stream():
    """
    Test endpoint to verify audio streaming works.
    Returns the most recent podcast.mp3 if it exists.
    """
    output_dir = Path(__file__).parent / "output"
    audio_file = output_dir / "podcast.mp3"
    
    if not audio_file.exists():
        # Try test_output directory
        test_output_dir = Path(__file__).parent / "test_output"
        audio_file = test_output_dir / "podcast.mp3"
    
    if audio_file.exists():
        return await stream_audio(audio_file.name, None, "")
    else:
        raise HTTPException(status_code=404, detail="No podcast.mp3 found. Generate one first using /generate-podcast")

# Export the router
__all__ = ["podcast_router", "PodcastConfig", "process_pdf_to_podcast"]

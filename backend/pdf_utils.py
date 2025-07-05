import logging
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

def get_research_paper_text(file_bytes: bytes) -> str:
    """Extract text from research paper PDFs with better formatting preservation."""
    text = ""
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page_num, page in enumerate(doc):
                blocks = page.get_text("blocks")
                blocks.sort(key=lambda b: (b[1], b[0]))  # Sort by y, then x
                text += f"--- Page {page_num + 1} ---\n\n"
                for block in blocks:
                    block_text = block[4].strip()
                    if block_text:
                        text += block_text + "\n\n"
    except Exception as e:
        logger.error(f"Error reading the PDF file: {e}")
        raise Exception(f"Error reading the PDF file: {e}")

    if len(text) > 400_000:
        logger.warning("The PDF is too long (over ~131k tokens).")
    
    return text 
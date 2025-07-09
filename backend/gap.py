#!/usr/bin/env python3
"""
Research Gap Identifier Tool
Analyzes PDF documents and identifies research gaps using OpenAI and web scraping
"""

import os
import re
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import requests
from dataclasses import dataclass

# Web Scraping
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException
from bs4 import BeautifulSoup

# OpenAI
import openai

# Data Processing
import pandas as pd
import numpy as np
from collections import Counter, defaultdict
from dotenv import load_dotenv

from pdf_utils import get_research_paper_text

load_dotenv()
# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ResearchPaper:
    title: str
    abstract: str
    content: str
    keywords: List[str]
    methodology: str
    findings: str
    limitations: str
    future_work: str

@dataclass
class ResearchGap:
    gap_type: str
    description: str
    importance: str
    suggested_directions: List[str]
    related_papers: List[str]
    confidence_score: float

class PDFProcessor:
    """Extract and process text from PDF files"""
    
    def __init__(self):
        self.text_content = ""
        self.metadata = {}
    
    def process_pdf_bytes(self, pdf_bytes: bytes) -> str:
        """Main method to extract text from PDF bytes"""
        logger.info("Processing PDF from bytes")
        
        text = get_research_paper_text(pdf_bytes)
        
        self.text_content = text
        return text
    
    def extract_sections(self, text: str) -> Dict[str, str]:
        """Extract different sections from the research paper"""
        sections = {
            'abstract': '',
            'introduction': '',
            'methodology': '',
            'results': '',
            'discussion': '',
            'conclusion': '',
            'references': '',
            'limitations': '',
            'future_work': ''
        }
        
        # Common section headers patterns
        patterns = {
            'abstract': r'(?i)abstract\s*:?\s*(.*?)(?=\n\s*(?:keywords|introduction|1\.|i\.|background))',
            'introduction': r'(?i)(?:introduction|1\.\s*introduction)\s*:?\s*(.*?)(?=\n\s*(?:methodology|method|2\.|ii\.))',
            'methodology': r'(?i)(?:methodology|methods?|2\.\s*method)\s*:?\s*(.*?)(?=\n\s*(?:results|findings|3\.|iii\.))',
            'results': r'(?i)(?:results?|findings|3\.\s*results?)\s*:?\s*(.*?)(?=\n\s*(?:discussion|conclusion|4\.|iv\.))',
            'discussion': r'(?i)(?:discussion|4\.\s*discussion)\s*:?\s*(.*?)(?=\n\s*(?:conclusion|5\.|v\.))',
            'conclusion': r'(?i)(?:conclusion|conclusions?|5\.\s*conclusion)\s*:?\s*(.*?)(?=\n\s*(?:references|bibliography|acknowledgment))',
            'limitations': r'(?i)limitations?\s*:?\s*(.*?)(?=\n\s*(?:future|conclusion|references))',
            'future_work': r'(?i)(?:future\s*work|future\s*research|recommendations?)\s*:?\s*(.*?)(?=\n\s*(?:conclusion|references|acknowledgment))'
        }
        
        for section, pattern in patterns.items():
            match = re.search(pattern, text, re.DOTALL)
            if match:
                sections[section] = match.group(1).strip()[:2000]  # Limit length
        
        return sections

class WebScraper:
    """Scrape academic sources for related research"""
    
    def __init__(self):
        self.driver = self._setup_driver()
    
    def _setup_driver(self):
        """Setup Chrome driver with options"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        try:
            driver = webdriver.Chrome(options=chrome_options)
            driver.set_page_load_timeout(30)
            return driver
        except WebDriverException as e:
            logger.error(f"Error setting up Chrome driver: {e}")
            logger.warning("Web scraping functionality will be disabled. Install ChromeDriver to enable.")
            return None
        except Exception as e:
            logger.error(f"Unexpected error setting up Chrome driver: {e}")
            return None
    
    def search_google_scholar(self, query: str, max_results: int = 10) -> List[Dict]:
        """Search Google Scholar for related papers"""
        if not self.driver:
            return []
        
        papers = []
        try:
            url = f"https://scholar.google.com/scholar?q={query.replace(' ', '+')}&hl=en"
            self.driver.get(url)
            time.sleep(2)
            
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            results = soup.find_all('div', class_='gs_r gs_or gs_scl')
            
            for i, result in enumerate(results[:max_results]):
                try:
                    title_elem = result.find('h3', class_='gs_rt')
                    title = title_elem.get_text() if title_elem else "Unknown Title"
                    
                    snippet_elem = result.find('div', class_='gs_rs')
                    snippet = snippet_elem.get_text() if snippet_elem else ""
                    
                    authors_elem = result.find('div', class_='gs_a')
                    authors = authors_elem.get_text() if authors_elem else ""
                    
                    papers.append({
                        'title': title,
                        'snippet': snippet,
                        'authors': authors,
                        'source': 'Google Scholar'
                    })
                except Exception as e:
                    logger.error(f"Error parsing result {i}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error searching Google Scholar: {e}")
        
        return papers
    
    def search_arxiv(self, query: str, max_results: int = 10) -> List[Dict]:
        """Search arXiv for related papers"""
        papers = []
        try:
            url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={max_results}"
            response = requests.get(url)
            
            if response.status_code == 200:
                from xml.etree import ElementTree as ET
                root = ET.fromstring(response.content)
                
                for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
                    title = entry.find('{http://www.w3.org/2005/Atom}title').text
                    summary = entry.find('{http://www.w3.org/2005/Atom}summary').text
                    
                    authors = []
                    for author in entry.findall('{http://www.w3.org/2005/Atom}author'):
                        name = author.find('{http://www.w3.org/2005/Atom}name').text
                        authors.append(name)
                    
                    papers.append({
                        'title': title.strip() if title else "Unknown Title",
                        'snippet': summary.strip() if summary else "",
                        'authors': ', '.join(authors),
                        'source': 'arXiv'
                    })
                    
        except Exception as e:
            logger.error(f"Error searching arXiv: {e}")
        
        return papers
    
    def close(self):
        """Close the web driver"""
        if self.driver:
            self.driver.quit()

class OpenAIAnalyzer:
    """Use OpenAI to analyze research and identify gaps"""
    
    def __init__(self, api_key: str):
        openai.api_key = api_key
        self.client = openai.OpenAI(api_key=api_key)
    
    def extract_key_information(self, text: str) -> Dict[str, str]:
        """Extract key information from research paper"""
        
        prompt = f"""
        Analyze the following research paper text and extract the key information.
        Format the output as a JSON object with the following keys: "title", "keywords", "methodology", "findings", "limitations", "future_work".

        Text:
        {text[:15000]}
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            return self.parse_extraction_response(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Error extracting key info from OpenAI: {e}")
            return {}

    def parse_extraction_response(self, response: str) -> Dict[str, str]:
        try:
            data = json.loads(response)
            # Ensure all keys are present
            keys = ["title", "keywords", "methodology", "findings", "limitations", "future_work"]
            for key in keys:
                if key not in data:
                    data[key] = data.get(key, "") # Add empty string if missing
            return data
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON from OpenAI extraction response.")
            return {}

    def analyze_literature_gaps(self, main_paper: Dict, related_papers: List[Dict]) -> List[Dict]:
        
        main_paper_summary = f"Title: {main_paper.get('title', '')}\nFindings: {main_paper.get('findings', '')}\nLimitations: {main_paper.get('limitations', '')}"
        
        related_literature_summary = "\n".join([
            f"Related Paper Title: {p.get('title', '')}\nSnippet: {p.get('snippet', '')}" 
            for p in related_papers
        ])
        
        prompt = f"""
        Given the main research paper and a list of related literature, identify potential research gaps.
        A research gap is a question or problem that has not been answered by any of the existing studies or literature within a particular field.
        
        Main Paper Summary:
        {main_paper_summary}
        
        Related Literature:
        {related_literature_summary}
        
        Based on this, identify 3-5 distinct research gaps. For each gap, provide:
        - gap_type: e.g., "Methodological", "Theoretical", "Empirical"
        - description: A clear, concise description of the gap.
        - importance: Why addressing this gap is important.
        - suggested_directions: 1-3 concrete research questions or directions.
        - confidence_score: A float from 0.0 to 1.0 indicating your confidence.

        Return a JSON object with a "research_gaps" key containing a list of these gap objects.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            gaps_data = json.loads(response.choices[0].message.content)
            return gaps_data.get("research_gaps", [])
        except Exception as e:
            logger.error(f"Error analyzing literature gaps with OpenAI: {e}")
            return []

    def generate_research_landscape_map(self, main_paper: Dict, related_papers: List[Dict], gaps: List[Dict]) -> str:
        
        main_paper_summary = f"Title: {main_paper.get('title', '')}, Keywords: {main_paper.get('keywords', '')}"
        related_titles = ", ".join([p.get('title', '') for p in related_papers])
        gap_descriptions = "\n".join([f"- {g['description']}" for g in gaps])
        
        prompt = f"""
        Create a textual "Research Landscape Map" based on the provided information.
        This map should be a narrative that synthesizes the information, showing how the main paper fits in with related work and what the key open questions (gaps) are.
        
        Main Paper: {main_paper_summary}
        Related Papers: {related_titles}
        Identified Gaps:
        {gap_descriptions}
        
        Produce a ~300 word narrative.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating landscape map: {e}")
            return "Failed to generate research landscape map."

class ResearchGapIdentifier:
    """Main class to orchestrate the research gap identification process"""
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.pdf_processor = PDFProcessor()
        self.web_scraper = WebScraper()
        self.openai_analyzer = OpenAIAnalyzer(api_key=openai_api_key)
        self.analysis_results = {}

    def analyze_research_paper(self, pdf_bytes: bytes) -> Dict:
        """
        Analyzes a research paper from PDF bytes to identify research gaps.
        """
        self.analysis_results = {} 

        text_content = self.pdf_processor.process_pdf_bytes(pdf_bytes)
        if not text_content:
            return {"error": "Failed to extract text from PDF."}

        logger.info("Extracting key information from the paper...")
        main_paper_info = self.openai_analyzer.extract_key_information(text_content)
        if not main_paper_info.get('title'):
            return {"error": "Could not extract a title from the paper."}
        self.analysis_results['main_paper'] = main_paper_info
        
        logger.info("Scraping for related papers...")
        keywords = main_paper_info.get('keywords', [])
        search_query = f"{main_paper_info['title']} {' '.join(keywords)}"
        
        related_papers = self.web_scraper.search_google_scholar(search_query, max_results=5)
        self.analysis_results['related_papers'] = related_papers
        
        logger.info("Analyzing literature to identify gaps...")
        research_gaps = self.openai_analyzer.analyze_literature_gaps(main_paper_info, related_papers)
        self.analysis_results['research_gaps'] = research_gaps
        
        logger.info("Generating research landscape map...")
        landscape_map = self.openai_analyzer.generate_research_landscape_map(main_paper_info, related_papers, research_gaps)
        self.analysis_results['research_landscape'] = landscape_map
        
        logger.info("Analysis complete.")
        return self.analysis_results

    def cleanup(self):
        """Clean up resources like the web driver"""
        self.web_scraper.close()

# FastAPI router for gap analysis
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional

class GapAnalysisResponse(BaseModel):
    status: str
    analysis: Optional[Dict] = None

gap_router = APIRouter()

@gap_router.post("/analyze", response_model=GapAnalysisResponse)
async def analyze_gaps(pdf_file: UploadFile = File(...)):
    """
    Analyze a research paper to identify research gaps.
    
    This endpoint will:
    1. Extract key information from the PDF
    2. Search for related papers
    3. Identify research gaps using AI
    4. Generate a research landscape map
    """
    try:
        pdf_bytes = await pdf_file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Get OpenAI API key
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        gap_identifier = ResearchGapIdentifier(openai_api_key=openai_api_key)
        analysis = gap_identifier.analyze_research_paper(pdf_bytes)
        gap_identifier.cleanup()
        
        return GapAnalysisResponse(status="success", analysis=analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze gaps: {str(e)}")

# Export the router
__all__ = ["gap_router", "ResearchGapIdentifier"]
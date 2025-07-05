#!/usr/bin/env python3
"""
Research Insights: AI/ML Research Paper & News Analyzer
=======================================================

A multi-agent system that automatically collects, analyzes, and summarizes
the latest research papers and news in AI/ML, providing technical insights
and implications for researchers and practitioners.

Features:
- Automated research paper discovery
- Technical news aggregation
- Intelligent summarization with technical depth
- Impact analysis and trend identification
- Citation tracking and relevance scoring
"""

import os
import json
import requests
from typing import Dict, List, Any, TypedDict, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from pydantic import BaseModel
from dotenv import load_dotenv
from tavily import TavilyClient
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph

# Load environment variables
load_dotenv()

# Initialize API clients
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.1
)

# ============================================================================
# Data Models
# ============================================================================

@dataclass
class ResearchPaper:
    """Represents a research paper with metadata"""
    title: str
    abstract: str
    authors: List[str]
    arxiv_id: str
    published_date: str
    url: str
    categories: List[str]
    
class NewsArticle(BaseModel):
    """Represents a news article"""
    title: str
    url: str
    content: str
    source: str
    published_date: Optional[str] = None

class PaperInsight(TypedDict):
    """Technical insights from research papers"""
    title: str
    authors: List[str]
    key_contributions: str
    technical_implications: str
    potential_applications: str
    methodology: str
    significance_score: int  # 1-10 scale
    arxiv_id: str
    url: str

class NewsInsight(TypedDict):
    """Insights from news articles"""
    title: str
    summary: str
    industry_impact: str
    technical_relevance: str
    url: str
    source: str

class GraphState(TypedDict):
    """Workflow state management"""
    research_papers: Optional[List[ResearchPaper]]
    news_articles: Optional[List[NewsArticle]]
    paper_insights: Optional[List[PaperInsight]]
    news_insights: Optional[List[NewsInsight]]
    final_report: Optional[str]
    research_focus: str  # Topic focus for search

# ============================================================================
# Research Paper Discovery Agent
# ============================================================================

class ResearchDiscoveryAgent:
    """Agent for discovering and collecting research papers"""
    
    def __init__(self):
        self.arxiv_base_url = "http://export.arxiv.org/api/query"
        
    def search_arxiv(self, query: str, max_results: int = 10) -> List[ResearchPaper]:
        """Search ArXiv for recent research papers"""
        
        # Calculate date range (last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        # ArXiv search parameters
        params = {
            'search_query': f'all:{query}',
            'start': 0,
            'max_results': max_results,
            'sortBy': 'submittedDate',
            'sortOrder': 'descending'
        }
        
        try:
            response = requests.get(self.arxiv_base_url, params=params)
            response.raise_for_status()
            
            papers = []
            # Parse XML response (simplified - in production use proper XML parsing)
            content = response.text
            
            # Extract paper information (basic parsing)
            entries = content.split('<entry>')
            for entry in entries[1:]:  # Skip first empty split
                try:
                    paper = self._parse_arxiv_entry(entry)
                    if paper:
                        papers.append(paper)
                except Exception as e:
                    print(f"Error parsing entry: {e}")
                    continue
                    
            return papers
            
        except Exception as e:
            print(f"Error searching ArXiv: {e}")
            return []
    
    def _parse_arxiv_entry(self, entry: str) -> Optional[ResearchPaper]:
        """Parse a single ArXiv entry (simplified XML parsing)"""
        try:
            # Extract title
            title_start = entry.find('<title>') + 7
            title_end = entry.find('</title>')
            title = entry[title_start:title_end].strip()
            
            # Extract abstract
            abstract_start = entry.find('<summary>') + 9
            abstract_end = entry.find('</summary>')
            abstract = entry[abstract_start:abstract_end].strip()
            
            # Extract ArXiv ID
            id_start = entry.find('<id>') + 4
            id_end = entry.find('</id>')
            full_id = entry[id_start:id_end].strip()
            arxiv_id = full_id.split('/')[-1]
            
            # Extract published date
            published_start = entry.find('<published>') + 11
            published_end = entry.find('</published>')
            published = entry[published_start:published_end].strip()
            
            # Extract authors (simplified)
            authors = []
            author_entries = entry.split('<author>')
            for author_entry in author_entries[1:]:
                name_start = author_entry.find('<name>') + 6
                name_end = author_entry.find('</name>')
                if name_start > 5 and name_end > name_start:
                    authors.append(author_entry[name_start:name_end].strip())
            
            # Extract categories
            categories = []
            if '<category term="' in entry:
                cat_start = entry.find('<category term="') + 16
                cat_end = entry.find('"', cat_start)
                if cat_end > cat_start:
                    categories.append(entry[cat_start:cat_end])
            
            return ResearchPaper(
                title=title,
                abstract=abstract,
                authors=authors,
                arxiv_id=arxiv_id,
                published_date=published,
                url=full_id,
                categories=categories
            )
            
        except Exception as e:
            print(f"Error parsing entry: {e}")
            return None

# ============================================================================
# Technical News Agent
# ============================================================================

class TechnicalNewsAgent:
    """Agent for discovering technical news and industry updates"""
    
    def search_technical_news(self, focus_area: str) -> List[NewsArticle]:
        """Search for technical news related to the focus area"""
        try:
            # Search for recent technical news
            response = tavily.search(
                query=f"{focus_area} research breakthrough technical news",
                topic="news",
                time_period="1w",
                search_depth="advanced",
                max_results=8
            )
            
            articles = []
            for result in response.get('results', []):
                articles.append(NewsArticle(
                    title=result.get('title', ''),
                    url=result.get('url', ''),
                    content=result.get('content', ''),
                    source=result.get('url', '').split('/')[2] if result.get('url') else '',
                    published_date=result.get('published_date')
                ))
            
            return articles
            
        except Exception as e:
            print(f"Error searching technical news: {e}")
            return []

# ============================================================================
# Research Analysis Agent
# ============================================================================

class ResearchAnalysisAgent:
    """Agent for analyzing research papers and extracting insights"""
    
    def __init__(self):
        self.analysis_prompt = """
        You are a senior AI/ML researcher analyzing a research paper. 
        Provide a comprehensive technical analysis including:

        1. Key Contributions: What are the main innovations or findings?
        2. Technical Implications: How does this advance the field?
        3. Potential Applications: Where could this be applied in practice?
        4. Methodology: What approaches/techniques were used?
        5. Significance Score: Rate the potential impact (1-10 scale)

        Be technical but accessible. Focus on practical implications.
        """
    
    def analyze_paper(self, paper: ResearchPaper) -> PaperInsight:
        """Analyze a research paper and extract key insights"""
        
        paper_text = f"""
        Title: {paper.title}
        Authors: {', '.join(paper.authors)}
        Abstract: {paper.abstract}
        Categories: {', '.join(paper.categories)}
        """
        
        try:
            response = llm.invoke([
                SystemMessage(content=self.analysis_prompt),
                HumanMessage(content=paper_text)
            ])
            
            # Handle response content properly
            analysis = response.content
            if isinstance(analysis, list):
                analysis = ' '.join(str(item) for item in analysis)
            
            # Extract significance score (simple regex approach)
            significance_score = 7  # Default score
            if "significance score:" in analysis.lower():
                try:
                    score_section = analysis.lower().split("significance score:")[1]
                    score_str = score_section.split()[0].strip()
                    significance_score = int(score_str.split('/')[0])
                except:
                    pass
            
            return PaperInsight(
                title=paper.title,
                authors=paper.authors,
                key_contributions=self._extract_section(analysis, "key contributions"),
                technical_implications=self._extract_section(analysis, "technical implications"),
                potential_applications=self._extract_section(analysis, "potential applications"),
                methodology=self._extract_section(analysis, "methodology"),
                significance_score=significance_score,
                arxiv_id=paper.arxiv_id,
                url=paper.url
            )
            
        except Exception as e:
            print(f"Error analyzing paper: {e}")
            # Return basic insight if analysis fails
            return PaperInsight(
                title=paper.title,
                authors=paper.authors,
                key_contributions="Analysis unavailable",
                technical_implications="Analysis unavailable",
                potential_applications="Analysis unavailable",
                methodology="Analysis unavailable",
                significance_score=5,
                arxiv_id=paper.arxiv_id,
                url=paper.url
            )
    
    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a specific section from the analysis"""
        try:
            lower_text = text.lower()
            section_start = lower_text.find(section_name.lower())
            if section_start == -1:
                return "Not specified"
            
            # Find the start of the content
            content_start = lower_text.find(":", section_start) + 1
            
            # Find the end (next numbered section or end of text)
            next_section = lower_text.find("\n\n", content_start)
            if next_section == -1:
                next_section = len(text)
            
            content = text[content_start:next_section].strip()
            return content if content else "Not specified"
            
        except Exception:
            return "Not specified"

# ============================================================================
# News Analysis Agent
# ============================================================================

class NewsAnalysisAgent:
    """Agent for analyzing news articles and extracting insights"""
    
    def __init__(self):
        self.analysis_prompt = """
        You are a technology analyst examining a news article. 
        Provide analysis focusing on:

        1. Technical Summary: Key technical points in accessible language
        2. Industry Impact: How this affects the industry/market
        3. Technical Relevance: Connection to current research trends
        
        Keep it concise but insightful.
        """
    
    def analyze_article(self, article: NewsArticle) -> NewsInsight:
        """Analyze a news article and extract insights"""
        
        article_text = f"""
        Title: {article.title}
        Source: {article.source}
        Content: {article.content}
        """
        
        try:
            response = llm.invoke([
                SystemMessage(content=self.analysis_prompt),
                HumanMessage(content=article_text)
            ])
            
            # Handle response content properly
            analysis = response.content
            if isinstance(analysis, list):
                analysis = ' '.join(str(item) for item in analysis)
            
            return NewsInsight(
                title=article.title,
                summary=self._extract_section(analysis, "technical summary"),
                industry_impact=self._extract_section(analysis, "industry impact"),
                technical_relevance=self._extract_section(analysis, "technical relevance"),
                url=article.url,
                source=article.source
            )
            
        except Exception as e:
            print(f"Error analyzing article: {e}")
            return NewsInsight(
                title=article.title,
                summary="Analysis unavailable",
                industry_impact="Analysis unavailable",
                technical_relevance="Analysis unavailable",
                url=article.url,
                source=article.source
            )
    
    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a specific section from the analysis"""
        try:
            lower_text = text.lower()
            section_start = lower_text.find(section_name.lower())
            if section_start == -1:
                return text.split('\n')[0] if text else "Not specified"
            
            content_start = lower_text.find(":", section_start) + 1
            next_section = lower_text.find("\n\n", content_start)
            if next_section == -1:
                next_section = len(text)
            
            content = text[content_start:next_section].strip()
            return content if content else "Not specified"
            
        except Exception:
            return "Not specified"

# ============================================================================
# Report Generation Agent
# ============================================================================

class ReportGenerationAgent:
    """Agent for generating comprehensive research insights reports"""
    
    def generate_comprehensive_report(self, paper_insights: List[PaperInsight], 
                                    news_insights: List[NewsInsight],
                                    focus_area: str) -> str:
        """Generate a comprehensive research insights report"""
        
        report_prompt = f"""
        Create a comprehensive research insights report for {focus_area}.
        
        Structure the report as:
        1. Executive Summary
        2. Top Research Breakthroughs (ranked by significance)
        3. Industry News & Developments
        4. Technical Trends & Implications
        5. Future Outlook
        6. Key Papers & Sources
        
        Make it suitable for researchers and technical professionals.
        """
        
        # Prepare data for the LLM
        papers_text = "\n\n".join([
            f"Paper: {insight['title']}\n"
            f"Authors: {', '.join(insight['authors'])}\n"
            f"Key Contributions: {insight['key_contributions']}\n"
            f"Technical Implications: {insight['technical_implications']}\n"
            f"Applications: {insight['potential_applications']}\n"
            f"Significance Score: {insight['significance_score']}/10\n"
            f"ArXiv ID: {insight['arxiv_id']}"
            for insight in paper_insights
        ])
        
        news_text = "\n\n".join([
            f"News: {insight['title']}\n"
            f"Source: {insight['source']}\n"
            f"Summary: {insight['summary']}\n"
            f"Industry Impact: {insight['industry_impact']}\n"
            f"Technical Relevance: {insight['technical_relevance']}"
            for insight in news_insights
        ])
        
        full_content = f"""
        RESEARCH PAPERS:
        {papers_text}
        
        NEWS ARTICLES:
        {news_text}
        """
        
        try:
            response = llm.invoke([
                SystemMessage(content=report_prompt),
                HumanMessage(content=full_content)
            ])
            
            # Add metadata
            current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            report = f"""
# Research Insights Report: {focus_area}

**Generated on:** {current_date}
**Focus Area:** {focus_area}
**Papers Analyzed:** {len(paper_insights)}
**News Articles Analyzed:** {len(news_insights)}

---

{response.content}

---

## Data Sources
- Research Papers: ArXiv.org
- News Articles: Various technical publications
- Analysis: GPT-4 powered insights

*This report was generated automatically by Research Insights AI*
"""
            
            # Save report
            filename = f"research_insights_{focus_area.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(report)
            
            print(f"Report saved as: {filename}")
            return report
            
        except Exception as e:
            print(f"Error generating report: {e}")
            return f"Error generating report: {e}"

# ============================================================================
# Workflow Nodes
# ============================================================================

def research_discovery_node(state: GraphState) -> GraphState:
    """Node for discovering research papers"""
    agent = ResearchDiscoveryAgent()
    focus = state.get('research_focus', 'artificial intelligence machine learning')
    
    print(f"🔍 Searching for research papers on: {focus}")
    papers = agent.search_arxiv(focus, max_results=10)
    
    return {
        **state,
        'research_papers': papers
    }

def news_discovery_node(state: GraphState) -> GraphState:
    """Node for discovering technical news"""
    agent = TechnicalNewsAgent()
    focus = state.get('research_focus', 'artificial intelligence')
    
    print(f"📰 Searching for technical news on: {focus}")
    articles = agent.search_technical_news(focus)
    
    return {
        **state,
        'news_articles': articles
    }

def research_analysis_node(state: GraphState) -> GraphState:
    """Node for analyzing research papers"""
    agent = ResearchAnalysisAgent()
    papers = state.get('research_papers', [])
    
    if papers is None:
        papers = []
    
    print(f"🔬 Analyzing {len(papers)} research papers...")
    insights = []
    for i, paper in enumerate(papers):
        print(f"  Analyzing paper {i+1}/{len(papers)}: {paper.title[:50]}...")
        insight = agent.analyze_paper(paper)
        insights.append(insight)
    
    return {
        **state,
        'paper_insights': insights
    }

def news_analysis_node(state: GraphState) -> GraphState:
    """Node for analyzing news articles"""
    agent = NewsAnalysisAgent()
    articles = state.get('news_articles', [])
    
    if articles is None:
        articles = []
    
    print(f"📊 Analyzing {len(articles)} news articles...")
    insights = []
    for i, article in enumerate(articles):
        print(f"  Analyzing article {i+1}/{len(articles)}: {article.title[:50]}...")
        insight = agent.analyze_article(article)
        insights.append(insight)
    
    return {
        **state,
        'news_insights': insights
    }

def report_generation_node(state: GraphState) -> GraphState:
    """Node for generating the final report"""
    agent = ReportGenerationAgent()
    paper_insights = state.get('paper_insights', [])
    news_insights = state.get('news_insights', [])
    focus = state.get('research_focus', 'AI/ML')
    
    if paper_insights is None:
        paper_insights = []
    if news_insights is None:
        news_insights = []
    
    print("📋 Generating comprehensive research insights report...")
    report = agent.generate_comprehensive_report(paper_insights, news_insights, focus)
    
    return {
        **state,
        'final_report': report
    }

# ============================================================================
# Workflow Creation
# ============================================================================

def create_research_workflow():
    """Create the research insights workflow"""
    workflow = StateGraph(state_schema=GraphState)
    
    # Add nodes
    workflow.add_node("research_discovery", research_discovery_node)
    workflow.add_node("news_discovery", news_discovery_node)
    workflow.add_node("research_analysis", research_analysis_node)
    workflow.add_node("news_analysis", news_analysis_node)
    workflow.add_node("report_generation", report_generation_node)
    
    # Set entry point
    workflow.set_entry_point("research_discovery")
    
    # Define sequential execution to avoid concurrent updates
    workflow.add_edge("research_discovery", "research_analysis")
    workflow.add_edge("research_analysis", "news_discovery")
    workflow.add_edge("news_discovery", "news_analysis")
    workflow.add_edge("news_analysis", "report_generation")
    
    return workflow.compile()

# ============================================================================
# Main Execution
# ============================================================================

def main():
    """Main execution function"""
    print("🚀 Research Insights AI - Starting Analysis...")
    print("=" * 60)
    
    # Get research focus from user
    focus_area = input("Enter research focus area (e.g., 'large language models', 'computer vision'): ").strip()
    if not focus_area:
        focus_area = "artificial intelligence machine learning"
    
    print(f"🎯 Research Focus: {focus_area}")
    print("=" * 60)
    
    # Create and run workflow
    workflow = create_research_workflow()
    
    initial_state: GraphState = {
        "research_papers": None,
        "news_articles": None,
        "paper_insights": None,
        "news_insights": None,
        "final_report": None,
        "research_focus": focus_area
    }
    
    try:
        final_state = workflow.invoke(initial_state)
        
        print("\n" + "=" * 60)
        print("📊 RESEARCH INSIGHTS SUMMARY")
        print("=" * 60)
        
        # Display summary statistics
        papers_analyzed = len(final_state.get('paper_insights', []))
        news_analyzed = len(final_state.get('news_insights', []))
        
        print(f"📄 Research Papers Analyzed: {papers_analyzed}")
        print(f"📰 News Articles Analyzed: {news_analyzed}")
        
        # Show top insights
        if final_state.get('paper_insights'):
            print("\n🏆 TOP RESEARCH INSIGHTS:")
            sorted_papers = sorted(final_state['paper_insights'], 
                                 key=lambda x: x['significance_score'], reverse=True)
            for i, paper in enumerate(sorted_papers[:3]):
                print(f"{i+1}. {paper['title']}")
                print(f"   Significance: {paper['significance_score']}/10")
                print(f"   Key Contribution: {paper['key_contributions'][:100]}...")
                print()
        
        print("✅ Analysis Complete! Check the generated markdown file for the full report.")
        
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        print("Please check your API keys and try again.")

if __name__ == "__main__":
    main()
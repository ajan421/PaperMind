#!/usr/bin/env python3
"""
CAG (Cache-Augmented Generation) Evaluation System
==================================================

This module provides comprehensive evaluation metrics for the CAG system:
- Answer Quality (Relevance, Accuracy, Completeness)
- Response Time Performance
- Cache Efficiency
- Multi-language Support Quality
- User Experience Metrics

Usage:
    python cag_evaluation.py --test-file questions.json
    or use the FastAPI endpoint for programmatic evaluation
"""

import os
import json
import time
import asyncio
import statistics
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path

import requests
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from rouge_score import rouge_scorer
import matplotlib.pyplot as plt
import seaborn as sns

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Download required NLTK data
import ssl
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

def ensure_nltk_data():
    """Ensure NLTK data is downloaded"""
    try:
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        print("📦 Downloading NLTK data...")
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('punkt_tab', quiet=True)
        except Exception as e:
            print(f"⚠️  NLTK download warning: {e}")
            print("Continuing with basic text processing...")

# Ensure NLTK data is available
ensure_nltk_data()

load_dotenv()

# Configuration
CAG_BASE_URL = "http://localhost:8000/cag"  # Adjust based on your setup

@dataclass
class EvaluationMetrics:
    """Data class to store evaluation metrics"""
    question: str
    expected_answer: str
    generated_answer: str
    response_time: float
    relevance_score: float
    accuracy_score: float
    completeness_score: float
    bleu_score: float
    rouge_l_score: float
    semantic_similarity: float
    language: str = "en"
    timestamp: str = ""

@dataclass
class CAGPerformanceReport:
    """Comprehensive performance report for CAG system"""
    total_questions: int
    avg_response_time: float
    avg_relevance_score: float
    avg_accuracy_score: float
    avg_completeness_score: float
    avg_bleu_score: float
    avg_rouge_score: float
    avg_semantic_similarity: float
    cache_hit_rate: float
    multilingual_accuracy: Dict[str, float]
    performance_breakdown: List[EvaluationMetrics]
    evaluation_timestamp: str
    recommendations: List[str]

class CAGEvaluator:
    """Main evaluation class for CAG system"""
    
    def __init__(self, base_url: str = CAG_BASE_URL):
        self.base_url = base_url
        self.vectorizer = TfidfVectorizer()
        self.rouge_scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
        self.smoothing_function = SmoothingFunction().method1
        
    def reset_cag_session(self) -> bool:
        """Reset CAG session before evaluation"""
        try:
            response = requests.post(f"{self.base_url}/reset-session")
            return response.status_code == 200
        except Exception as e:
            print(f"Error resetting CAG session: {e}")
            return False
    
    def upload_test_documents(self, pdf_files: List[str]) -> bool:
        """Upload test documents to CAG system"""
        try:
            files = []
            for pdf_file in pdf_files:
                if os.path.exists(pdf_file):
                    files.append(('files', (os.path.basename(pdf_file), open(pdf_file, 'rb'), 'application/pdf')))
            
            if not files:
                print("No valid PDF files found for upload")
                return False
            
            response = requests.post(f"{self.base_url}/upload", files=files)
            
            # Close file handles
            for _, (_, file_handle, _) in files:
                file_handle.close()
            
            return response.status_code == 200
        except Exception as e:
            print(f"Error uploading documents: {e}")
            return False
    
    def ask_question(self, question: str, language: str = "en") -> Tuple[str, float]:
        """Ask a question to CAG system and measure response time"""
        start_time = time.time()
        
        try:
            data = {
                'question': question,
                'language': language
            }
            response = requests.post(f"{self.base_url}/ask-question", data=data)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', ''), response_time
            else:
                return f"Error: {response.status_code}", response_time
                
        except Exception as e:
            response_time = time.time() - start_time
            return f"Error: {str(e)}", response_time
    
    def calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts using TF-IDF and cosine similarity"""
        try:
            if not text1.strip() or not text2.strip():
                return 0.0
            
            vectors = self.vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
            return float(similarity)
        except Exception:
            return 0.0
    
    def calculate_bleu_score(self, reference: str, candidate: str) -> float:
        """Calculate BLEU score between reference and candidate texts"""
        try:
            # Use simple tokenization if NLTK tokenizer fails
            try:
                reference_tokens = nltk.word_tokenize(reference.lower())
                candidate_tokens = nltk.word_tokenize(candidate.lower())
            except:
                # Fallback to simple split-based tokenization
                reference_tokens = reference.lower().split()
                candidate_tokens = candidate.lower().split()
            
            if not reference_tokens or not candidate_tokens:
                return 0.0
            
            score = sentence_bleu([reference_tokens], candidate_tokens, 
                                smoothing_function=self.smoothing_function)
            return float(score)
        except Exception:
            return 0.0
    
    def calculate_rouge_score(self, reference: str, candidate: str) -> float:
        """Calculate ROUGE-L score between reference and candidate texts"""
        try:
            scores = self.rouge_scorer.score(reference, candidate)
            return float(scores['rougeL'].fmeasure)
        except Exception:
            return 0.0
    
    def calculate_relevance_score(self, question: str, answer: str) -> float:
        """Calculate how relevant the answer is to the question"""
        try:
            # Simple keyword-based relevance (can be improved with more sophisticated methods)
            try:
                question_words = set(nltk.word_tokenize(question.lower()))
                answer_words = set(nltk.word_tokenize(answer.lower()))
            except:
                # Fallback to simple split-based tokenization
                question_words = set(question.lower().split())
                answer_words = set(answer.lower().split())
            
            if not question_words:
                return 0.0
            
            overlap = len(question_words.intersection(answer_words))
            relevance = overlap / len(question_words)
            return min(relevance, 1.0)  # Cap at 1.0
        except Exception:
            return 0.0
    
    def calculate_completeness_score(self, expected: str, generated: str) -> float:
        """Calculate how complete the generated answer is compared to expected"""
        try:
            try:
                expected_words = set(nltk.word_tokenize(expected.lower()))
                generated_words = set(nltk.word_tokenize(generated.lower()))
            except:
                # Fallback to simple split-based tokenization
                expected_words = set(expected.lower().split())
                generated_words = set(generated.lower().split())
            
            if not expected_words:
                return 1.0
            
            coverage = len(expected_words.intersection(generated_words)) / len(expected_words)
            return min(coverage, 1.0)
        except Exception:
            return 0.0
    
    def evaluate_single_question(self, question: str, expected_answer: str, 
                                language: str = "en") -> EvaluationMetrics:
        """Evaluate a single question-answer pair"""
        generated_answer, response_time = self.ask_question(question, language)
        
        # Calculate various metrics
        relevance_score = self.calculate_relevance_score(question, generated_answer)
        accuracy_score = self.calculate_semantic_similarity(expected_answer, generated_answer)
        completeness_score = self.calculate_completeness_score(expected_answer, generated_answer)
        bleu_score = self.calculate_bleu_score(expected_answer, generated_answer)
        rouge_score = self.calculate_rouge_score(expected_answer, generated_answer)
        semantic_similarity = self.calculate_semantic_similarity(expected_answer, generated_answer)
        
        return EvaluationMetrics(
            question=question,
            expected_answer=expected_answer,
            generated_answer=generated_answer,
            response_time=response_time,
            relevance_score=relevance_score,
            accuracy_score=accuracy_score,
            completeness_score=completeness_score,
            bleu_score=bleu_score,
            rouge_l_score=rouge_score,
            semantic_similarity=semantic_similarity,
            language=language,
            timestamp=datetime.now().isoformat()
        )
    
    def evaluate_test_set(self, test_data: List[Dict[str, Any]], 
                         pdf_files: List[str] = None) -> CAGPerformanceReport:
        """Evaluate CAG system with a test set"""
        print("🚀 Starting CAG Evaluation...")
        
        # Reset session and upload documents if provided
        if pdf_files:
            print("📄 Uploading test documents...")
            self.reset_cag_session()
            if not self.upload_test_documents(pdf_files):
                raise Exception("Failed to upload test documents")
        
        # Wait for processing
        time.sleep(2)
        
        # Evaluate each question
        results = []
        languages = set()
        
        print(f"❓ Evaluating {len(test_data)} questions...")
        for i, item in enumerate(test_data, 1):
            question = item['question']
            expected = item['expected_answer']
            language = item.get('language', 'en')
            languages.add(language)
            
            print(f"  {i}/{len(test_data)}: {question[:50]}...")
            
            result = self.evaluate_single_question(question, expected, language)
            results.append(result)
        
        # Calculate aggregate metrics
        response_times = [r.response_time for r in results]
        relevance_scores = [r.relevance_score for r in results]
        accuracy_scores = [r.accuracy_score for r in results]
        completeness_scores = [r.completeness_score for r in results]
        bleu_scores = [r.bleu_score for r in results]
        rouge_scores = [r.rouge_l_score for r in results]
        semantic_similarities = [r.semantic_similarity for r in results]
        
        # Calculate multilingual accuracy
        multilingual_accuracy = {}
        for lang in languages:
            lang_results = [r for r in results if r.language == lang]
            if lang_results:
                lang_accuracy = statistics.mean([r.accuracy_score for r in lang_results])
                multilingual_accuracy[lang] = lang_accuracy
        
        # Generate recommendations
        recommendations = self.generate_recommendations(results)
        
        report = CAGPerformanceReport(
            total_questions=len(test_data),
            avg_response_time=statistics.mean(response_times),
            avg_relevance_score=statistics.mean(relevance_scores),
            avg_accuracy_score=statistics.mean(accuracy_scores),
            avg_completeness_score=statistics.mean(completeness_scores),
            avg_bleu_score=statistics.mean(bleu_scores),
            avg_rouge_score=statistics.mean(rouge_scores),
            avg_semantic_similarity=statistics.mean(semantic_similarities),
            cache_hit_rate=0.0,  # TODO: Implement cache hit tracking
            multilingual_accuracy=multilingual_accuracy,
            performance_breakdown=results,
            evaluation_timestamp=datetime.now().isoformat(),
            recommendations=recommendations
        )
        
        print("✅ Evaluation completed!")
        return report
    
    def generate_recommendations(self, results: List[EvaluationMetrics]) -> List[str]:
        """Generate improvement recommendations based on evaluation results"""
        recommendations = []
        
        avg_response_time = statistics.mean([r.response_time for r in results])
        avg_accuracy = statistics.mean([r.accuracy_score for r in results])
        avg_relevance = statistics.mean([r.relevance_score for r in results])
        
        if avg_response_time > 3.0:
            recommendations.append("🚀 Consider optimizing response time - average is above 3 seconds")
        
        if avg_accuracy < 0.7:
            recommendations.append("🎯 Improve answer accuracy - consider fine-tuning the model or improving context retrieval")
        
        if avg_relevance < 0.6:
            recommendations.append("🔍 Enhance relevance scoring - answers may not be addressing questions directly")
        
        slow_questions = [r for r in results if r.response_time > avg_response_time * 1.5]
        if slow_questions:
            recommendations.append(f"⚡ {len(slow_questions)} questions had significantly slow responses - investigate document chunking")
        
        if not recommendations:
            recommendations.append("✨ System performance looks good! Consider A/B testing for further improvements")
        
        return recommendations
    
    def save_report(self, report: CAGPerformanceReport, output_file: str = None):
        """Save evaluation report to JSON and generate visualizations"""
        if output_file is None:
            output_file = f"cag_evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Save JSON report
        report_dict = asdict(report)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, indent=2, ensure_ascii=False)
        
        print(f"📊 Report saved to: {output_file}")
        
        # Generate visualizations
        self.create_visualizations(report, output_file.replace('.json', ''))
    
    def create_visualizations(self, report: CAGPerformanceReport, base_filename: str):
        """Create visualization charts for the evaluation report"""
        try:
            import matplotlib.pyplot as plt
            import seaborn as sns
            
            # Set style
            plt.style.use('seaborn-v0_8')
            fig, axes = plt.subplots(2, 2, figsize=(15, 12))
            fig.suptitle('CAG System Evaluation Results', fontsize=16, fontweight='bold')
            
            # 1. Response Time Distribution
            response_times = [r.response_time for r in report.performance_breakdown]
            axes[0, 0].hist(response_times, bins=20, alpha=0.7, color='skyblue', edgecolor='black')
            axes[0, 0].set_title('Response Time Distribution')
            axes[0, 0].set_xlabel('Response Time (seconds)')
            axes[0, 0].set_ylabel('Frequency')
            axes[0, 0].axvline(report.avg_response_time, color='red', linestyle='--', 
                              label=f'Avg: {report.avg_response_time:.2f}s')
            axes[0, 0].legend()
            
            # 2. Quality Metrics Bar Chart
            metrics = ['Relevance', 'Accuracy', 'Completeness', 'BLEU', 'ROUGE-L', 'Semantic Sim.']
            scores = [
                report.avg_relevance_score,
                report.avg_accuracy_score,
                report.avg_completeness_score,
                report.avg_bleu_score,
                report.avg_rouge_score,
                report.avg_semantic_similarity
            ]
            
            bars = axes[0, 1].bar(metrics, scores, color=['#ff9999', '#66b3ff', '#99ff99', '#ffcc99', '#ff99cc', '#c2c2f0'])
            axes[0, 1].set_title('Average Quality Metrics')
            axes[0, 1].set_ylabel('Score')
            axes[0, 1].set_ylim(0, 1)
            axes[0, 1].tick_params(axis='x', rotation=45)
            
            # Add value labels on bars
            for bar, score in zip(bars, scores):
                axes[0, 1].text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.01,
                               f'{score:.3f}', ha='center', va='bottom')
            
            # 3. Multilingual Performance
            if report.multilingual_accuracy:
                languages = list(report.multilingual_accuracy.keys())
                accuracies = list(report.multilingual_accuracy.values())
                
                axes[1, 0].bar(languages, accuracies, color='lightgreen')
                axes[1, 0].set_title('Multilingual Accuracy')
                axes[1, 0].set_ylabel('Accuracy Score')
                axes[1, 0].set_ylim(0, 1)
                
                for i, acc in enumerate(accuracies):
                    axes[1, 0].text(i, acc + 0.01, f'{acc:.3f}', ha='center', va='bottom')
            else:
                axes[1, 0].text(0.5, 0.5, 'No multilingual data', ha='center', va='center', 
                               transform=axes[1, 0].transAxes)
                axes[1, 0].set_title('Multilingual Accuracy (No Data)')
            
            # 4. Performance Summary
            axes[1, 1].axis('off')
            summary_text = f"""
            📊 EVALUATION SUMMARY
            
            Total Questions: {report.total_questions}
            Avg Response Time: {report.avg_response_time:.2f}s
            Avg Accuracy: {report.avg_accuracy_score:.3f}
            Avg Relevance: {report.avg_relevance_score:.3f}
            Avg BLEU Score: {report.avg_bleu_score:.3f}
            
            🎯 TOP RECOMMENDATIONS:
            """
            
            for i, rec in enumerate(report.recommendations[:3], 1):
                summary_text += f"\n{i}. {rec}"
            
            axes[1, 1].text(0.05, 0.95, summary_text, transform=axes[1, 1].transAxes,
                           fontsize=10, verticalalignment='top', fontfamily='monospace',
                           bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray", alpha=0.8))
            
            plt.tight_layout()
            chart_file = f"{base_filename}_charts.png"
            plt.savefig(chart_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            print(f"📈 Visualizations saved to: {chart_file}")
            
        except Exception as e:
            print(f"❌ Error creating visualizations: {e}")

# Sample test data generator
def generate_sample_test_data() -> List[Dict[str, Any]]:
    """Generate sample test data for CAG evaluation"""
    return [
        {
            "question": "What is the main contribution of this research paper?",
            "expected_answer": "The main contribution is the development of a novel attention mechanism that improves model performance.",
            "language": "en"
        },
        {
            "question": "What methodology was used in this study?",
            "expected_answer": "The study used a quantitative experimental design with statistical analysis.",
            "language": "en"
        },
        {
            "question": "What are the limitations mentioned in the paper?",
            "expected_answer": "The limitations include small sample size and limited generalizability.",
            "language": "en"
        },
        {
            "question": "¿Cuáles son los resultados principales?",
            "expected_answer": "Los resultados principales muestran una mejora significativa en el rendimiento.",
            "language": "es"
        },
        {
            "question": "What future work is suggested?",
            "expected_answer": "Future work includes expanding the dataset and testing on different domains.",
            "language": "en"
        }
    ]

# FastAPI router for evaluation endpoints
evaluation_router = APIRouter()

class EvaluationRequest(BaseModel):
    test_data: List[Dict[str, Any]]
    pdf_files: Optional[List[str]] = None

class EvaluationResponse(BaseModel):
    status: str
    report_file: str
    summary: Dict[str, float]

@evaluation_router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_cag_system(request: EvaluationRequest):
    """Evaluate CAG system with provided test data"""
    try:
        evaluator = CAGEvaluator()
        report = evaluator.evaluate_test_set(request.test_data, request.pdf_files)
        
        # Save report
        report_file = f"cag_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        evaluator.save_report(report, report_file)
        
        summary = {
            "avg_response_time": report.avg_response_time,
            "avg_accuracy": report.avg_accuracy_score,
            "avg_relevance": report.avg_relevance_score,
            "avg_bleu_score": report.avg_bleu_score,
            "total_questions": report.total_questions
        }
        
        return EvaluationResponse(
            status="success",
            report_file=report_file,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@evaluation_router.get("/sample-test-data")
async def get_sample_test_data():
    """Get sample test data for CAG evaluation"""
    return {"sample_data": generate_sample_test_data()}

# Main execution
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate CAG System")
    parser.add_argument("--test-file", help="JSON file with test data")
    parser.add_argument("--pdf-files", nargs="*", help="PDF files to upload for testing")
    parser.add_argument("--output", help="Output report file")
    
    args = parser.parse_args()
    
    # Load test data
    if args.test_file and os.path.exists(args.test_file):
        with open(args.test_file, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
    else:
        print("📝 Using sample test data...")
        test_data = generate_sample_test_data()
    
    # Run evaluation
    evaluator = CAGEvaluator()
    report = evaluator.evaluate_test_set(test_data, args.pdf_files)
    
    # Save report
    output_file = args.output or f"cag_evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    evaluator.save_report(report, output_file)
    
    # Print summary
    print("\n" + "="*60)
    print("🎯 CAG EVALUATION SUMMARY")
    print("="*60)
    print(f"📊 Total Questions: {report.total_questions}")
    print(f"⏱️  Avg Response Time: {report.avg_response_time:.2f}s")
    print(f"🎯 Avg Accuracy: {report.avg_accuracy_score:.3f}")
    print(f"🔍 Avg Relevance: {report.avg_relevance_score:.3f}")
    print(f"📝 Avg BLEU Score: {report.avg_bleu_score:.3f}")
    print(f"📋 Avg ROUGE Score: {report.avg_rouge_score:.3f}")
    print("\n🚀 RECOMMENDATIONS:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"  {i}. {rec}")
    print("="*60) 
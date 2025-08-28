#!/usr/bin/env python3
"""
Simple CAG Evaluation Script
============================

A lightweight evaluation script for CAG systems that doesn't require
complex dependencies like NLTK, sklearn, etc. Perfect for quick evaluations.

Usage:
    python simple_cag_evaluation.py
    python simple_cag_evaluation.py --test-file sample_test_questions.json
"""

import os
import json
import time
import statistics
import requests
from typing import List, Dict, Any, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict

# Configuration
CAG_BASE_URL = "http://localhost:8000/cag"

@dataclass
class SimpleEvaluationMetrics:
    """Simple evaluation metrics without complex dependencies"""
    question: str
    expected_answer: str
    generated_answer: str
    response_time: float
    word_overlap_score: float
    length_similarity: float
    exact_match: bool
    language: str = "en"
    timestamp: str = ""

@dataclass
class SimpleCAGReport:
    """Simple performance report"""
    total_questions: int
    avg_response_time: float
    avg_word_overlap: float
    avg_length_similarity: float
    exact_matches: int
    multilingual_performance: Dict[str, float]
    performance_breakdown: List[SimpleEvaluationMetrics]
    evaluation_timestamp: str
    recommendations: List[str]

class SimpleCAGEvaluator:
    """Simple CAG evaluator without complex dependencies"""
    
    def __init__(self, base_url: str = CAG_BASE_URL):
        self.base_url = base_url
    
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
    
    def calculate_word_overlap(self, text1: str, text2: str) -> float:
        """Calculate word overlap between two texts"""
        try:
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            
            if not words1 or not words2:
                return 0.0
            
            overlap = len(words1.intersection(words2))
            total_unique = len(words1.union(words2))
            
            return overlap / total_unique if total_unique > 0 else 0.0
        except Exception:
            return 0.0
    
    def calculate_length_similarity(self, text1: str, text2: str) -> float:
        """Calculate length similarity between two texts"""
        try:
            len1 = len(text1.split())
            len2 = len(text2.split())
            
            if len1 == 0 and len2 == 0:
                return 1.0
            
            if len1 == 0 or len2 == 0:
                return 0.0
            
            # Similarity based on length ratio
            ratio = min(len1, len2) / max(len1, len2)
            return ratio
        except Exception:
            return 0.0
    
    def is_exact_match(self, text1: str, text2: str) -> bool:
        """Check if texts are exact matches (case insensitive)"""
        try:
            return text1.lower().strip() == text2.lower().strip()
        except Exception:
            return False
    
    def evaluate_single_question(self, question: str, expected_answer: str, 
                                language: str = "en") -> SimpleEvaluationMetrics:
        """Evaluate a single question-answer pair"""
        generated_answer, response_time = self.ask_question(question, language)
        
        # Calculate simple metrics
        word_overlap = self.calculate_word_overlap(expected_answer, generated_answer)
        length_similarity = self.calculate_length_similarity(expected_answer, generated_answer)
        exact_match = self.is_exact_match(expected_answer, generated_answer)
        
        return SimpleEvaluationMetrics(
            question=question,
            expected_answer=expected_answer,
            generated_answer=generated_answer,
            response_time=response_time,
            word_overlap_score=word_overlap,
            length_similarity=length_similarity,
            exact_match=exact_match,
            language=language,
            timestamp=datetime.now().isoformat()
        )
    
    def evaluate_test_set(self, test_data: List[Dict[str, Any]], 
                         pdf_files: List[str] = None) -> SimpleCAGReport:
        """Evaluate CAG system with a test set"""
        print("🚀 Starting Simple CAG Evaluation...")
        
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
        word_overlaps = [r.word_overlap_score for r in results]
        length_similarities = [r.length_similarity for r in results]
        exact_matches = sum(1 for r in results if r.exact_match)
        
        # Calculate multilingual performance
        multilingual_performance = {}
        for lang in languages:
            lang_results = [r for r in results if r.language == lang]
            if lang_results:
                lang_performance = statistics.mean([r.word_overlap_score for r in lang_results])
                multilingual_performance[lang] = lang_performance
        
        # Generate recommendations
        recommendations = self.generate_recommendations(results)
        
        report = SimpleCAGReport(
            total_questions=len(test_data),
            avg_response_time=statistics.mean(response_times),
            avg_word_overlap=statistics.mean(word_overlaps),
            avg_length_similarity=statistics.mean(length_similarities),
            exact_matches=exact_matches,
            multilingual_performance=multilingual_performance,
            performance_breakdown=results,
            evaluation_timestamp=datetime.now().isoformat(),
            recommendations=recommendations
        )
        
        print("✅ Evaluation completed!")
        return report
    
    def generate_recommendations(self, results: List[SimpleEvaluationMetrics]) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        avg_response_time = statistics.mean([r.response_time for r in results])
        avg_overlap = statistics.mean([r.word_overlap_score for r in results])
        exact_matches = sum(1 for r in results if r.exact_match)
        
        if avg_response_time > 3.0:
            recommendations.append("🚀 Consider optimizing response time - average is above 3 seconds")
        
        if avg_overlap < 0.5:
            recommendations.append("🎯 Improve answer relevance - low word overlap with expected answers")
        
        if exact_matches == 0:
            recommendations.append("🔍 No exact matches found - consider improving answer precision")
        
        slow_questions = [r for r in results if r.response_time > avg_response_time * 1.5]
        if slow_questions:
            recommendations.append(f"⚡ {len(slow_questions)} questions had slow responses - check document processing")
        
        if not recommendations:
            recommendations.append("✨ System performance looks good! Consider more detailed evaluation")
        
        return recommendations
    
    def save_report(self, report: SimpleCAGReport, output_file: str = None):
        """Save evaluation report to JSON"""
        if output_file is None:
            output_file = f"simple_cag_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_dict = asdict(report)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, indent=2, ensure_ascii=False)
        
        print(f"📊 Report saved to: {output_file}")

def generate_sample_test_data() -> List[Dict[str, Any]]:
    """Generate sample test data"""
    return [
        {
            "question": "What is the main contribution of this research paper?",
            "expected_answer": "The main contribution is the development of a novel attention mechanism.",
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
            "question": "What future work is suggested?",
            "expected_answer": "Future work includes expanding the dataset and testing on different domains.",
            "language": "en"
        }
    ]

def print_evaluation_summary(report: SimpleCAGReport):
    """Print a formatted evaluation summary"""
    print("\n" + "="*60)
    print("🎯 SIMPLE CAG EVALUATION SUMMARY")
    print("="*60)
    print(f"📊 Total Questions: {report.total_questions}")
    print(f"⏱️  Avg Response Time: {report.avg_response_time:.2f}s")
    print(f"🔗 Avg Word Overlap: {report.avg_word_overlap:.3f}")
    print(f"📏 Avg Length Similarity: {report.avg_length_similarity:.3f}")
    print(f"✅ Exact Matches: {report.exact_matches}/{report.total_questions}")
    
    if report.multilingual_performance:
        print(f"\n🌍 Multilingual Performance:")
        for lang, performance in report.multilingual_performance.items():
            print(f"   {lang}: {performance:.3f}")
    
    print("\n🚀 RECOMMENDATIONS:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"  {i}. {rec}")
    print("="*60)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Simple CAG System Evaluation")
    parser.add_argument("--test-file", help="JSON file with test data")
    parser.add_argument("--pdf-files", nargs="*", help="PDF files to upload for testing")
    parser.add_argument("--output", help="Output report file")
    
    args = parser.parse_args()
    
    # Load test data
    if args.test_file and os.path.exists(args.test_file):
        print(f"📂 Loading test data from: {args.test_file}")
        with open(args.test_file, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
    else:
        print("📝 Using sample test data...")
        test_data = generate_sample_test_data()
    
    # Check if CAG server is running
    try:
        response = requests.get("http://localhost:8000/cag/health", timeout=5)
        if response.status_code != 200:
            print("❌ CAG server is not responding properly")
            return
    except requests.exceptions.RequestException:
        print("❌ CAG server is not running. Start it with:")
        print("   python main_app.py")
        print("   or")
        print("   uvicorn main_app:app --reload")
        return
    
    # Run evaluation
    evaluator = SimpleCAGEvaluator()
    report = evaluator.evaluate_test_set(test_data, args.pdf_files)
    
    # Save report
    output_file = args.output or f"simple_cag_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    evaluator.save_report(report, output_file)
    
    # Print summary
    print_evaluation_summary(report)

if __name__ == "__main__":
    main() 
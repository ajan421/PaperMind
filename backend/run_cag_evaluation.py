#!/usr/bin/env python3
"""
CAG Evaluation Runner
====================

Simple script to run CAG evaluation with various options.

Usage Examples:
    # Run with sample data
    python run_cag_evaluation.py

    # Run with custom test data
    python run_cag_evaluation.py --test-file sample_test_questions.json

    # Run with specific PDF files
    python run_cag_evaluation.py --test-file sample_test_questions.json --pdf-files paper1.pdf paper2.pdf

    # Run via API (requires server to be running)
    python run_cag_evaluation.py --use-api
"""

import os
import sys
import json
import argparse
import requests
from pathlib import Path
from datetime import datetime

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'nltk', 'rouge_score', 'sklearn', 'matplotlib', 'seaborn'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for pkg in missing_packages:
            print(f"   - {pkg}")
        print("\n📦 Install missing packages with:")
        print("   pip install -r requirements.txt")
        return False
    
    return True

def run_local_evaluation(test_file: str = None, pdf_files: list = None, output_file: str = None):
    """Run evaluation locally using the CAGEvaluator class"""
    try:
        from cag_evaluation import CAGEvaluator, generate_sample_test_data
        
        # Load test data
        if test_file and os.path.exists(test_file):
            print(f"📂 Loading test data from: {test_file}")
            with open(test_file, 'r', encoding='utf-8') as f:
                test_data = json.load(f)
        else:
            print("📝 Using sample test data...")
            test_data = generate_sample_test_data()
        
        print(f"❓ Loaded {len(test_data)} test questions")
        
        # Initialize evaluator
        evaluator = CAGEvaluator()
        
        # Check if CAG server is running
        try:
            response = requests.get("http://localhost:8000/cag/health", timeout=5)
            if response.status_code != 200:
                print("❌ CAG server is not responding properly")
                return False
        except requests.exceptions.RequestException:
            print("❌ CAG server is not running. Start it with:")
            print("   python main_app.py")
            print("   or")
            print("   uvicorn main_app:app --reload")
            return False
        
        # Run evaluation
        print("\n🚀 Starting CAG evaluation...")
        report = evaluator.evaluate_test_set(test_data, pdf_files)
        
        # Save report
        if output_file is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"cag_evaluation_report_{timestamp}.json"
        
        evaluator.save_report(report, output_file)
        
        # Print summary
        print_evaluation_summary(report)
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed and the evaluation module exists.")
        return False
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        return False

def run_api_evaluation(test_file: str = None, pdf_files: list = None):
    """Run evaluation via FastAPI endpoint"""
    try:
        # Load test data
        if test_file and os.path.exists(test_file):
            with open(test_file, 'r', encoding='utf-8') as f:
                test_data = json.load(f)
        else:
            # Get sample data from API
            response = requests.get("http://localhost:8000/evaluation/sample-test-data")
            if response.status_code == 200:
                test_data = response.json()["sample_data"]
            else:
                print("❌ Failed to get sample test data from API")
                return False
        
        # Prepare request
        request_data = {
            "test_data": test_data,
            "pdf_files": pdf_files or []
        }
        
        print(f"🚀 Starting API evaluation with {len(test_data)} questions...")
        
        # Send evaluation request
        response = requests.post(
            "http://localhost:8000/evaluation/evaluate",
            json=request_data,
            timeout=300  # 5 minutes timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Evaluation completed successfully!")
            print(f"📊 Report saved to: {result['report_file']}")
            print("\n📈 Summary:")
            for key, value in result['summary'].items():
                print(f"   {key}: {value:.3f}")
            return True
        else:
            print(f"❌ API evaluation failed: {response.status_code}")
            print(f"   {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ API request failed: {e}")
        print("Make sure the FastAPI server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        return False

def print_evaluation_summary(report):
    """Print a formatted evaluation summary"""
    print("\n" + "="*60)
    print("🎯 CAG EVALUATION SUMMARY")
    print("="*60)
    print(f"📊 Total Questions: {report.total_questions}")
    print(f"⏱️  Avg Response Time: {report.avg_response_time:.2f}s")
    print(f"🎯 Avg Accuracy: {report.avg_accuracy_score:.3f}")
    print(f"🔍 Avg Relevance: {report.avg_relevance_score:.3f}")
    print(f"📝 Avg BLEU Score: {report.avg_bleu_score:.3f}")
    print(f"📋 Avg ROUGE Score: {report.avg_rouge_score:.3f}")
    print(f"🔗 Avg Semantic Similarity: {report.avg_semantic_similarity:.3f}")
    
    if report.multilingual_accuracy:
        print(f"\n🌍 Multilingual Performance:")
        for lang, acc in report.multilingual_accuracy.items():
            print(f"   {lang}: {acc:.3f}")
    
    print("\n🚀 RECOMMENDATIONS:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"  {i}. {rec}")
    print("="*60)

def main():
    parser = argparse.ArgumentParser(
        description="Run CAG (Cache-Augmented Generation) Evaluation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_cag_evaluation.py
  python run_cag_evaluation.py --test-file sample_test_questions.json
  python run_cag_evaluation.py --test-file questions.json --pdf-files paper1.pdf paper2.pdf
  python run_cag_evaluation.py --use-api --test-file questions.json
        """
    )
    
    parser.add_argument(
        "--test-file", 
        help="JSON file with test questions and expected answers"
    )
    parser.add_argument(
        "--pdf-files", 
        nargs="*", 
        help="PDF files to upload for testing"
    )
    parser.add_argument(
        "--output", 
        help="Output report file (default: auto-generated)"
    )
    parser.add_argument(
        "--use-api", 
        action="store_true",
        help="Use FastAPI endpoint instead of direct evaluation"
    )
    parser.add_argument(
        "--check-deps", 
        action="store_true",
        help="Check if required dependencies are installed"
    )
    
    args = parser.parse_args()
    
    # Check dependencies if requested
    if args.check_deps:
        if check_dependencies():
            print("✅ All required dependencies are installed!")
        else:
            print("❌ Some dependencies are missing.")
        return
    
    # Validate PDF files if provided
    if args.pdf_files:
        valid_files = []
        for pdf_file in args.pdf_files:
            if os.path.exists(pdf_file) and pdf_file.endswith('.pdf'):
                valid_files.append(pdf_file)
            else:
                print(f"⚠️  Warning: {pdf_file} not found or not a PDF file")
        args.pdf_files = valid_files
        
        if valid_files:
            print(f"📄 Will use {len(valid_files)} PDF files for testing")
    
    # Check dependencies
    if not check_dependencies():
        return
    
    # Run evaluation
    print("🧠 CAG Evaluation System")
    print("========================")
    
    if args.use_api:
        print("🌐 Using FastAPI endpoint...")
        success = run_api_evaluation(args.test_file, args.pdf_files)
    else:
        print("🔧 Using local evaluation...")
        success = run_local_evaluation(args.test_file, args.pdf_files, args.output)
    
    if success:
        print("\n✅ Evaluation completed successfully!")
        if not args.use_api:
            print("📈 Check the generated report file and charts for detailed results.")
    else:
        print("\n❌ Evaluation failed. Check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 
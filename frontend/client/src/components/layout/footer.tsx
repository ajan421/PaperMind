import { Link } from "wouter";
import { Button } from "../ui/button";

export default function Footer() {
  return (
    <div>
    {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                PaperMind
              </h3>
              <p className="text-gray-300 mb-6 max-w-md">
                Revolutionizing research with AI-powered tools for analysis, insights, and discovery. 
                Accelerate your academic journey with cutting-edge technology.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-800">
                  Contact Us
                </Button>
                <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-800">
                  Documentation
                </Button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/research-assistant" className="text-gray-300 hover:text-white transition-colors">Research Assistant</Link></li>
                <li><Link href="/podcast-generator" className="text-gray-300 hover:text-white transition-colors">Podcast Generator</Link></li>
                <li><Link href="/gap-analyzer" className="text-gray-300 hover:text-white transition-colors">Gap Analyzer</Link></li>
                <li><Link href="/systematic-review" className="text-gray-300 hover:text-white transition-colors">Systematic Review</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 PaperMind. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
  )
}
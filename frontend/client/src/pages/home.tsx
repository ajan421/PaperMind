import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Mic, BarChart3, FileText, MessageSquare, TrendingUp, ArrowRight, Activity, Globe, Zap, Users } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { SystemStatus } from '@/components/ui/system-status';

const features = [
  {
    icon: Bot,
    title: 'Research Paper Agent',
    description: 'Get AI-powered answers to your research questions instantly without file uploads.',
    href: '/research-assistant',
    color: 'from-blue-500 to-blue-600',
    badge: 'Interactive',
  },
  {
    icon: Mic,
    title: 'Podcast Generator',
    description: 'Transform research papers into engaging podcast conversations with multiple voices.',
    href: '/podcast-generator',
    color: 'from-purple-500 to-purple-600',
    badge: 'Audio',
  },
  {
    icon: BarChart3,
    title: 'Research Gap Analyzer',
    description: 'Identify research gaps and opportunities in your field with confidence scoring.',
    href: '/gap-analyzer',
    color: 'from-green-500 to-green-600',
    badge: 'Analysis',
  },
  {
    icon: FileText,
    title: 'Systematic Review',
    description: 'Generate comprehensive systematic reviews from topics with automated literature search.',
    href: '/systematic-review',
    color: 'from-orange-500 to-orange-600',
    badge: 'Academic',
  },
  {
    icon: MessageSquare,
    title: 'CAG System',
    description: 'Multi-language Q&A on uploaded documents with conversation history and context.',
    href: '/cag-system',
    color: 'from-indigo-500 to-indigo-600',
    badge: 'Multi-language',
  },
  {
    icon: TrendingUp,
    title: 'Research Insights',
    description: 'Discover and summarize the latest research papers and news with trend analysis.',
    href: '/research-insights',
    color: 'from-teal-500 to-teal-600',
    badge: 'Real-time',
  },
];

export default function Home() {
	const { data: insightsStatus } = useQuery({
		queryKey: ['insightsStatus'],
		queryFn: () => api.getInsightsStatus(),
		refetchInterval: 300000, // 5 minutes
		retry: 1,
	});

	const isInsightsAvailable = insightsStatus?.availability === true;

	return (
		<div className="min-h-screen">
			{/* Hero Section */}
			<div className="animated-background text-white py-24 relative overflow-hidden">
				<div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
				<div className="container mx-auto px-4 relative z-10">
					<div className="max-w-5xl mx-auto text-center">
						<div className="mb-8 text-animate-slide-up">
							<span className="inline-block bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full text-sm font-medium mb-6 border border-white/10 shadow-lg">
								🚀 Powered by Advanced AI
							</span>
						</div>
						<h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight text-animate-slide-up text-glow">
							Revolutionize Your
							<span className="block bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent text-animate-slide-up-delay glow-pulse">
								Research Journey
							</span>
						</h1>
						<p className="text-xl md:text-2xl mb-12 opacity-90 max-w-4xl mx-auto leading-relaxed text-animate-slide-up-delay">
							PaperMind automates research paper analysis, generates podcasts, identifies research gaps, and provides intelligent insights to accelerate your academic journey.
						</p>
					</div>
				</div>
				{/* Enhanced Floating Elements */}
				<div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-400/30 to-blue-400/30 rounded-full morphing-blob floating-element blur-xl"></div>
				<div className="absolute bottom-32 right-16 w-40 h-40 bg-gradient-to-r from-pink-400/25 to-yellow-400/25 rounded-full morphing-blob floating-element blur-2xl"></div>
				<div className="absolute top-1/3 left-1/4 w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full morphing-blob floating-element blur-xl"></div>
				<div className="absolute top-16 right-1/4 w-20 h-20 bg-gradient-to-r from-yellow-400/30 to-pink-400/30 rounded-full morphing-blob floating-element blur-lg"></div>
				<div className="absolute bottom-16 left-1/3 w-28 h-28 bg-gradient-to-r from-indigo-400/25 to-purple-400/25 rounded-full morphing-blob floating-element blur-xl"></div>

				{/* Geometric Floating Shapes */}
				<div className="absolute top-1/4 right-10 w-6 h-6 bg-white/40 particle-float transform rotate-45"></div>
				<div className="absolute bottom-1/4 left-20 w-8 h-8 bg-yellow-400/50 particle-float rounded-full"></div>
				<div className="absolute top-3/4 right-1/3 w-4 h-4 bg-pink-400/60 particle-float"></div>
				<div className="absolute top-1/2 right-20 w-3 h-3 bg-blue-400/70 particle-float rounded-full"></div>
				<div className="absolute bottom-1/3 left-1/2 w-5 h-5 bg-purple-400/50 particle-float transform rotate-12"></div>
				<div className="absolute top-20 left-1/2 w-2 h-2 bg-white/60 particle-float"></div>
				<div className="absolute bottom-20 right-1/4 w-6 h-6 bg-indigo-400/40 particle-float rounded-full"></div>

				{/* Starfield Effects */}
				<div className="stars" style={{ top: '10%', left: '15%' }}></div>
				<div className="stars" style={{ top: '20%', right: '20%' }}></div>
				<div className="stars" style={{ top: '30%', left: '70%' }}></div>
				<div className="stars" style={{ top: '50%', left: '10%' }}></div>
				<div className="stars" style={{ top: '70%', right: '15%' }}></div>
				<div className="stars" style={{ top: '80%', left: '60%' }}></div>
				<div className="stars" style={{ top: '25%', left: '40%' }}></div>
				<div className="stars" style={{ top: '65%', right: '45%' }}></div>

				{/* Meteor Effects */}
				<div className="meteor" style={{ top: '15%', left: '5%' }}></div>
				<div className="meteor" style={{ top: '45%', right: '10%', animationDelay: '-1s' }}></div>

				{/* Additional Background Effects */}
				<div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5"></div>
				<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50/10 to-transparent dark:from-gray-900/10"></div>
			</div>

			{/* Features Grid */}
			<div className="container mx-auto px-4 py-20">
				{/* System Status Section */}
				<div className="mb-16">
					<div className="max-w-6xl mx-auto">
						<div className="text-center mb-8">
							<h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
								<Activity className="h-7 w-7 text-primary" />
								System Status & Overview
							</h2>
							<p className="text-muted-foreground text-lg">
								Real-time monitoring of all PaperMind services and capabilities
							</p>
						</div>
						
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
							<SystemStatus compact={false} />
							
							{/* Quick Stats */}
							<Card className="material-elevation-2 h-full">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg flex items-center gap-3">
										<Zap className="h-5 w-5 text-yellow-500" />
										Performance Metrics
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Features Available</span>
										<Badge variant="outline">{features.length}</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Multi-language Support</span>
										<Badge variant="outline">
											<Globe className="h-3 w-3 mr-1" />
											Yes
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Real-time Processing</span>
										<Badge variant="outline">
											<Activity className="h-3 w-3 mr-1" />
											Active
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">AI Models</span>
										<Badge variant="outline">GPT-4 Optimized</Badge>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>

				{/* Features Section */}
				<div className="text-center mb-16">
					<h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
						Powerful Research Tools
					</h2>
					<p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
						Discover our comprehensive suite of AI-powered tools designed to transform how you conduct research, analyze papers, and generate insights.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<Link key={index} href={feature.href}>
								<Card className="h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group material-elevation-2 gradient-border overflow-hidden relative">
									<div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
									<CardHeader className="relative z-10">
										<div className="flex items-center justify-between mb-4">
											<div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
												<Icon className="h-6 w-6" />
											</div>
											<Badge variant="secondary" className="text-xs">
												{feature.badge}
											</Badge>
										</div>
										<CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
											{feature.title}
										</CardTitle>
									</CardHeader>
									<CardContent className="relative z-10">
										<CardDescription className="text-muted-foreground leading-relaxed mb-4">
											{feature.description}
										</CardDescription>
										<div className="flex items-center text-sm text-primary font-medium group-hover:gap-3 transition-all duration-300">
											<span>Get Started</span>
											<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
										</div>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
}

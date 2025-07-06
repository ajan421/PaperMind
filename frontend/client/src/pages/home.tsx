import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Mic, BarChart3, FileText, MessageSquare, TrendingUp, ArrowRight, Activity, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const features = [  {
    icon: Bot,
    title: 'Research Assistant',
    description: 'Get AI-powered answers to your research questions instantly without file uploads.',
    href: '/research-assistant',
  },
	{
		icon: Mic,
		title: 'Podcast Generator',
		description: 'Transform research papers into engaging podcast conversations.',
		href: '/podcast-generator',
	},
	{
		icon: BarChart3,
		title: 'Research Gap Analyzer',
		description: 'Identify research gaps and opportunities in your field.',
		href: '/gap-analyzer',
	},
	{
		icon: FileText,
		title: 'Systematic Review',
		description: 'Generate comprehensive systematic reviews from topics or papers.',
		href: '/systematic-review',
	},
	{
		icon: MessageSquare,
		title: 'CAG System',
		description: 'Multi-language Q&A on uploaded documents with conversation history.',
		href: '/cag-system',
	},
	{
		icon: TrendingUp,
		title: 'Research Insights',
		description: 'Discover and summarize the latest research papers and news.',
		href: '/research-insights',
	},
];

export default function Home() {
	const { data: healthData, isLoading: healthLoading } = useQuery({
		queryKey: ['apiHealth'],
		queryFn: () => api.getHealth(),
		refetchInterval: 60000,
		retry: 1,
	});

	const { data: insightsStatus } = useQuery({
		queryKey: ['insightsStatus'],
		queryFn: () => api.getInsightsStatus(),
		refetchInterval: 300000, // 5 minutes
		retry: 1,
	});

	const isHealthy = healthData?.status === 'healthy';
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
					<div className="max-w-4xl mx-auto">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-3">
								<Activity className="h-6 w-6" />
								System Status
							</h2>
						</div>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Card className="material-elevation-2">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg flex items-center gap-3">
										{healthLoading ? (
											<div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
										) : isHealthy ? (
											<CheckCircle className="h-5 w-5 text-green-500" />
										) : (
											<XCircle className="h-5 w-5 text-red-500" />
										)}
										API Service
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-300">
											Core API functionality
										</span>
										<Badge variant={isHealthy ? "default" : "destructive"}>
											{healthLoading ? "Checking..." : isHealthy ? "Healthy" : "Offline"}
										</Badge>
									</div>
								</CardContent>
							</Card>

							<Card className="material-elevation-2">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg flex items-center gap-3">
										{isInsightsAvailable ? (
											<CheckCircle className="h-5 w-5 text-green-500" />
										) : (
											<XCircle className="h-5 w-5 text-yellow-500" />
										)}
										Research Insights
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-300">
											Latest research analysis
										</span>
										<Badge variant={isInsightsAvailable ? "default" : "secondary"}>
											{isInsightsAvailable ? "Available" : "Limited"}
										</Badge>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>

				<div className="text-center mb-16">
					<h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
						Powerful Research Tools
					</h2>
					<p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
						Transform your research workflow with our comprehensive suite of AI-powered tools
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<Link key={feature.href} href={feature.href}>
								<Card className={`feature-card material-elevation-2 hover:material-elevation-8 h-full group overflow-hidden relative ${
									index % 3 === 0 ? 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30' :
									index % 3 === 1 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30' :
									'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
								}`}>
									<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent rounded-full blur-2xl -translate-y-16 translate-x-16"></div>
									<CardHeader className="relative z-10">
										<div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
											index % 3 === 0 ? 'gradient-primary' :
											index % 3 === 1 ? 'gradient-accent' :
											'gradient-secondary'
										} group-hover:scale-110 transition-transform duration-300`}>
											<Icon className="h-7 w-7 text-white" />
										</div>
										<CardTitle className="text-xl mb-3 group-hover:text-purple-600 transition-colors">
											{feature.title}
										</CardTitle>
										<CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
											{feature.description}
										</CardDescription>
									</CardHeader>
									<CardContent className="relative z-10">
										<div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
											Try it now
											<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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

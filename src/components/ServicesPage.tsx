import React from 'react';
import { 
	Search,
	Users,
	Rocket,
	Calendar,
	MessageCircle,
	ArrowRight,
	CheckCircle2,
} from 'lucide-react';
import Navigation from './Navigation';
import Footer from './Footer';
import { CALENDLY_URL, TELEGRAM_URL, AVAILABILITY } from '../consts';

const services = [
	{
		id: 'audit',
		icon: Search,
		title: 'Technical Audit',
		subtitle: 'One-time deep dive into your stack',
		description: 'A comprehensive review of your infrastructure and smart contracts, with actionable recommendations.',
		includes: [
			'Infrastructure architecture review',
			'Smart contract gas optimization assessment',
			'Cost analysis (infra + on-chain)',
			'Security surface assessment',
			'Actionable roadmap with priorities',
		],
		timeline: '1-2 weeks',
		investment: 'Starting at €12,000',
		bestFor: 'Teams preparing for launch, post-raise cleanup, or "we think we\'re overpaying for infra" situations.',
	},
	{
		id: 'fractional',
		icon: Users,
		title: 'Fractional CTO',
		subtitle: 'Ongoing technical leadership, part-time',
		description: 'Senior technical leadership without the full-time overhead. Strategy, architecture, and mentorship.',
		includes: [
			'Weekly strategy sessions',
			'Architecture decisions & code reviews',
			'Team mentorship & hiring support',
			'Vendor/tool selection',
			'Investor & technical due diligence support',
		],
		timeline: '15-25 hours/month',
		investment: '€10,000-18,000/month',
		bestFor: 'Series A-B startups without a technical co-founder, or teams scaling past their current architecture.',
	},
	{
		id: 'project',
		icon: Rocket,
		title: 'Project-Based',
		subtitle: 'End-to-end delivery of specific outcomes',
		description: 'When you need something built right. Full ownership from architecture to production.',
		includes: [
			'Account Abstraction implementation (WebAuthn, Smart Sessions, 7579)',
			'Infrastructure migration (AWS/Vercel to self-hosted K8s)',
			'RPC/Indexing stack setup (eRPC, Ponder)',
			'Wallet SDK & smart contract development',
			'Performance optimization & cost reduction',
		],
		timeline: '4-12 weeks depending on scope',
		investment: 'Custom quote (typically €40,000-100,000)',
		bestFor: '"We need this built, and we need it built right."',
	},
];

const ServicesPage: React.FC = () => {
	return (
		<div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 font-sans selection:bg-gray-200 dark:selection:bg-white/20">
			<Navigation />

			<main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
				{/* Hero */}
				<section className="mb-16">
					<h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
						How I Can Help
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
						I work with Web3 teams who need senior technical leadership without the full-time overhead. 
						Whether it's a one-time audit, ongoing fractional CTO engagement, or a specific project delivery.
					</p>
					
					<div className="mt-6 flex items-center gap-2 text-sm">
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
							<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
							Available for {AVAILABILITY}
						</span>
					</div>
				</section>

				{/* Services */}
				<section className="space-y-12 mb-20">
					{services.map((service) => {
						const Icon = service.icon;
						return (
							<div 
								key={service.id}
								className="border border-gray-200 dark:border-white/10 rounded-lg p-6 md:p-8"
							>
								<div className="flex items-start gap-4 mb-6">
									<div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5">
										<Icon size={24} className="text-gray-600 dark:text-gray-400" />
									</div>
									<div>
										<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
											{service.title}
										</h2>
										<p className="text-gray-500 text-sm">
											{service.subtitle}
										</p>
									</div>
								</div>

								<p className="text-gray-600 dark:text-gray-400 mb-6">
									{service.description}
								</p>

								<div className="mb-6">
									<h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
										What's included:
									</h3>
									<ul className="space-y-2">
										{service.includes.map((item, i) => (
											<li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
												<CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
												<span>{item}</span>
											</li>
										))}
									</ul>
								</div>

								<div className="grid grid-cols-2 gap-4 mb-6 text-sm">
									<div>
										<span className="text-gray-500 block mb-1">Timeline</span>
										<span className="text-gray-900 dark:text-white font-medium">{service.timeline}</span>
									</div>
									<div>
										<span className="text-gray-500 block mb-1">Investment</span>
										<span className="text-gray-900 dark:text-white font-medium">{service.investment}</span>
									</div>
								</div>

								<div className="pt-4 border-t border-gray-200 dark:border-white/10">
									<p className="text-sm text-gray-500">
										<span className="font-medium text-gray-700 dark:text-gray-300">Best for: </span>
										{service.bestFor}
									</p>
								</div>
							</div>
						);
					})}
				</section>

				{/* Payment Info */}
				<section className="mb-16 p-6 bg-gray-50 dark:bg-white/5 rounded-lg">
					<h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
						Payment
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						All prices in EUR. Payable in USD at current rate, or crypto (BTC, ETH, USDC/USDT, EURe).
					</p>
				</section>

				{/* CTA */}
				<section className="text-center py-12 border-t border-gray-200 dark:border-white/10">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
						Let's Talk
					</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
						I take on 2-3 engagements at a time to ensure quality. 
						If I'm not the right fit, I'll tell you and point you in the right direction.
					</p>
					
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<a
							href={CALENDLY_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
						>
							<Calendar size={18} />
							Book a call
						</a>
						<a
							href={TELEGRAM_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
						>
							<MessageCircle size={18} />
							Message on Telegram
						</a>
					</div>
				</section>

				<Footer />
			</main>
		</div>
	);
};

export default ServicesPage;

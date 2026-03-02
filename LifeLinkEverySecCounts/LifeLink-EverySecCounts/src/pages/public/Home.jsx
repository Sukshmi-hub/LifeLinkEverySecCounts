import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import {
  Heart,
  Users,
  Building2,
  HandHeart,
  Activity,
  Shield,
  Clock,
  ArrowRight,
  Droplets,
  Stethoscope,
  AlertTriangle,
  Quote,
} from 'lucide-react';

const inspirationalQuotes = [
  { text: "The gift of blood is the gift of life.", author: "Unknown" },
  { text: "Donating blood is a simple thing to do, but it can make a big difference.", author: "Unknown" },
  { text: "One pint of blood can save up to three lives.", author: "American Red Cross" },
  { text: "Be the reason someone smiles today. Be the reason someone feels loved.", author: "Roy T. Bennett" },
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { text: "No one has ever become poor by giving.", author: "Anne Frank" },
  { text: "A hero is someone who has given their life to something bigger than oneself.", author: "Joseph Campbell" },
  { text: "Giving is not just about making a donation. It's about making a difference.", author: "Kathy Calvin" },
  { text: "The meaning of life is to find your gift. The purpose of life is to give it away.", author: "Pablo Picasso" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
];

const Home = () => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % inspirationalQuotes.length);
        setFadeIn(true);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentQuote = inspirationalQuotes[currentQuoteIndex];

  const stats = [
    { label: 'Lives Saved', value: '12,450+', icon: Heart },
    { label: 'Active Donors', value: '8,320', icon: Users },
    { label: 'Partner Hospitals', value: '156', icon: Building2 },
    { label: 'NGO Partners', value: '45', icon: HandHeart },
  ];

  const features = [
    {
      icon: Droplets,
      title: 'Blood Donation',
      description: 'Connect patients with compatible blood donors in real-time during emergencies.',
    },
    {
      icon: Stethoscope,
      title: 'Organ Matching',
      description: 'Advanced matching system to find compatible organ donors quickly and efficiently.',
    },
    {
      icon: AlertTriangle,
      title: 'Red Alert System',
      description: '24/7 emergency response system for critical medical situations.',
    },
    {
      icon: Building2,
      title: 'Hospital Network',
      description: 'Connected network of hospitals for seamless coordination and care.',
    },
    {
      icon: HandHeart,
      title: 'NGO Support',
      description: 'Financial assistance and support through our trusted NGO partners.',
    },
    {
      icon: Shield,
      title: 'Verified Platform',
      description: 'All donors, hospitals, and NGOs are verified for safety and trust.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Activity className="h-4 w-4" />
              Every Second Counts
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Connecting Lives,{' '}
              <span className="text-primary">Saving Futures</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              LifeLink bridges the gap between those who need help and those who can provide it.
              From blood donations to organ transplants, we make every second count.
            </p>

            {/* Changing Quotes */}
            <div className={`mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/10 transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
              <Quote className="h-8 w-8 text-primary/50 mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground italic">
                "{currentQuote.text}"
              </p>
              <p className="text-sm text-muted-foreground mt-2">— {currentQuote.author}</p>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link to="/login">
                <Button variant="hero" size="xl" className="w-full sm:w-auto gap-2">
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How LifeLink Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our platform connects patients, donors, hospitals, and NGOs in a seamless
              ecosystem designed to save lives.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Clock className="mx-auto h-12 w-12 text-primary-foreground/80" />
          <h2 className="mt-4 text-2xl font-bold text-primary-foreground sm:text-3xl">
            In Case of Emergency
          </h2>
          <p className="mt-2 text-primary-foreground/80">
            Our Red Alert system ensures immediate response to critical medical emergencies.
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            Login to access emergency services and connect with donors instantly.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Heart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">LifeLink</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 LifeLink. Every Second Counts. Made with ❤️ for humanity.
            </p>
            <div className="flex gap-4">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">
                About
              </Link>
              <Link to="/tribute" className="text-sm text-muted-foreground hover:text-primary">
                Tributes
              </Link>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
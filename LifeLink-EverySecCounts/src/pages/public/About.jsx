import React from 'react';
import Header from '@/components/Header';
import soumyaImg from '../../assets/team/soumya.jpeg';
import sukshmiImg from '../../assets/team/sukshmi.jpeg';
import srashtiImg from '../../assets/team/srashti.jpeg';
import { 
  Heart, 
  Target, 
  Shield, 
  Users, 
  Clock, 
  Award,
  CheckCircle,
  Globe,
  Zap,
  Flag,
} from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Heart,
      title: 'Human-Centric',
      description: 'Beyond data and matching, we remember that every request is a family hoping for a miracle.',
    },
    {
      icon: Shield,
      title: 'Radical Transparency',
      description: 'We maintain a verifiable audit trail for every organ and blood unit to ensure ethical compliance.',
    },
    {
      icon: Zap,
      title: 'Ultra-Response',
      description: 'Our proprietary matching algorithm reduces the "time-to-donor" from days to mere minutes.',
    },
    {
      icon: Flag,
      title: 'Building New India',
      description: 'Empowering our nation with indigenous technology to solve global healthcare challenges.',
    },
  ];

  const milestones = [
    { year: '2024', title: 'The Concept', description: 'Born from a classroom discussion to solve the critical gap in Indian emergency medical logistics.' },
    { year: '2025', title: 'Development Phase', description: 'Designing the architecture to handle nationwide connectivity across hospitals and NGOs.' },
    { year: '2026', title: 'Under Development', description: 'Soumya, Sukshmi, and Srashti are currently building the core engine for a safer tomorrow.' },
  ];

  const team = [
    { name: 'Soumya Goel', role: 'Developer | B.Tech 3rd Year', image: soumyaImg },
    { name: 'Sukshmi Pandey', role: 'Developer | B.Tech 3rd Year', image: sukshmiImg },
    { name: 'Srashti Katiyar', role: 'Developer | B.Tech 3rd Year', image: srashtiImg },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative py-20 gradient-hero overflow-hidden">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Innovating for a <span className="text-primary">New India</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              LifeLink is a digital initiative developed by engineering students 
              committed to transforming India's healthcare landscape. We are building 
              a future where no life is lost due to a lack of connection.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 border-b border-border">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-primary mb-4">
                <Target className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Our Vision</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                Student-Led Innovation for Social Impact
              </h2>
              <p className="mt-4 text-muted-foreground">
                As 3rd-year B.Tech students, we recognize that technology is the most 
                powerful tool to achieve the dream of a "New India." LifeLink bridges 
                the gap between donors, patients, and hospitals through a unified 
                emergency ecosystem.
              </p>
              <p className="mt-4 text-muted-foreground">
                Our platform is designed to optimize the "Golden Hour," ensuring that 
                logistics never stand in the way of a saved life.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  'Indigenous smart matching algorithms', 
                  'Bridging Rural-Urban healthcare gaps', 
                  'Transparent NGO financial assistance', 
                  'National network for blood and organ matching'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Heart className="h-32 w-32 text-primary/30" />
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-xl bg-card border border-border p-6 shadow-xl">
                <p className="text-xl font-bold text-primary">Mission</p>
                <p className="text-sm text-muted-foreground">Saving India, One Match at a Time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Our Core Philosophy</h2>
            <p className="mt-2 text-muted-foreground">Values driving our B.Tech project toward a national solution</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-6 text-center hover:shadow-md transition-shadow">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Our Development Roadmap</h2>
            <p className="mt-2 text-muted-foreground">The journey of three developers with a single mission</p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex flex-col md:flex-row gap-4 md:gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="flex-1 md:text-right">
                    {index % 2 === 0 && (
                      <div className="rounded-xl border border-border bg-card p-6">
                        <span className="text-sm font-medium text-primary">{milestone.year}</span>
                        <h3 className="mt-1 font-semibold text-foreground">{milestone.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-primary border-4 border-background" />
                  </div>
                  <div className="flex-1">
                    {index % 2 !== 0 && (
                      <div className="rounded-xl border border-border bg-card p-6">
                        <span className="text-sm font-medium text-primary">{milestone.year}</span>
                        <h3 className="mt-1 font-semibold text-foreground">{milestone.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-primary mb-4">
              <Users className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">The Developers</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Meet the Minds Behind LifeLink</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-3">
            {team.map((member, index) => (
              <div key={index} className="text-center group">
                <div className="relative inline-block mb-4">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-32 h-32 rounded-2xl object-cover mx-auto border-2 border-border group-hover:border-primary transition-all"
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Award className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 LifeLink Project. Currently under development for a better India.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
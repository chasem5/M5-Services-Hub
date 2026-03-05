import { useState, useEffect, useRef } from "react";
import logoPath from "/logo.webp";

const SERVICES = [
  {
    id: "building-engineering",
    title: "Building Engineering",
    description:
      "Expert facility management ensures the efficient operation of all building systems, including HVAC, electrical, plumbing, and mechanical infrastructure.",
    image:
      "https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/ff78fd35-1940-4612-99b6-f79503ecbe11/assets_task_01jshz3y2bf8e8aqnee0z10gb6_img_0.png?format=750w",
  },
  {
    id: "facility-solutions",
    title: "Facility Solutions",
    description:
      "Recurring maintenance services such as power washing, day porter services, handyman repairs, and exterior upkeep to keep your property in peak condition year-round.",
    image:
      "https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/1755fa1a-f0ca-4f60-a3a7-687496dec91c/20250423_1206_Pristine+Exterior+Maintenance_simple_compose_01jsj0p9g4fyd82nntjfdngy2w.png?format=750w",
  },
  {
    id: "janitorial",
    title: "Janitorial",
    description:
      "Comprehensive commercial cleaning services, including daily, nightly, and deep cleaning to maintain a pristine work environment. We also specialize in final clean services for post-construction, tenant turnovers, and renovation projects.",
    image:
      "https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/c522071a-6460-4ce3-b858-c39ae120d6ae/20250423_1143_Spotless+Commercial+Spaces_simple_compose_01jshzbd3vejctns9frxqsv8qb.png?format=750w",
  },
  {
    id: "special-projects",
    title: "Special Projects",
    description:
      "On-demand facility improvements, renovations, and one-time projects, including office build-outs, remodels, and property enhancements tailored to your business needs.",
    image:
      "https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/dc0094b4-150e-4cb7-b390-958d2211d07c/20250423_1146_Modern+Office+Renovation_simple_compose_01jshzgcnze8gb40n6tpa8hj8q.png?format=750w",
  },
  {
    id: "property-assessment",
    title: "Property Assessment",
    description:
      "Proactive facility evaluations to identify maintenance needs, ensure compliance, and prevent costly repairs with routine and customized inspection programs.",
    image:
      "https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/f4c56b8c-4bac-4a3b-8865-f2d4d2aeef40/20250423_1150_Proactive+Facility+Inspections_simple_compose_01jshzpmbafn78n2ek855jz5wf.png?format=750w",
  },
];

const CLIENTS = [
  { name: "CIP", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/8f6db156-ae6b-4675-93d1-bbffbd7bce8a/cip-logo-blue.jpg" },
  { name: "Transwestern", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/4a943532-971c-4aa4-a8d9-7477ebf9f9e3/Transwestern-Logo.png" },
  { name: "Bridge", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/09389edb-ddcc-4e6d-bf5f-aa133622e763/bridge-logo-3.png" },
  { name: "Sutter Health", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/c99ea5dc-debe-426c-823d-b333ead9a363/sutter-health.png" },
  { name: "JLL", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/c9582b64-7392-4ddf-b6c7-cb759cef663c/JLL_logo-svg-2.png" },
  { name: "Hines", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/0258e332-c95f-4aa3-915a-9ec7b6ee64b7/Hines-Red-Logo-PNG.png" },
  { name: "DoorDash", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/9744989c-af2a-43fc-a98e-fc2504298249/DoorDash-logo.jpg" },
  { name: "PG&E", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/a4c46427-a0b6-44fe-8ae7-b2c81d75188f/PGE-Logo.png" },
  { name: "Amazon", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/3de7e02c-8725-4ff1-807d-40b444453399/amazon-logo-transparent.png" },
  { name: "Enterprise Mobility", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/ea3a7112-1b27-4809-8ebb-a5462ef6652f/Enterprise_Mobility_Logo.jpg" },
  { name: "CBRE", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/1b4c5221-3b39-4abf-90e5-c6839285f7b2/cbre_group-logo_brandlogos-net_eyfmh.png" },
  { name: "Cushman & Wakefield", url: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/6382bb0d-041d-463d-8fda-fd597fc2276a/Cushman_-_Wakefield_logo-svg.png" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      data-testid="header-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-sm border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        <a href="/" data-testid="link-logo" className="flex items-center">
          <img src={logoPath} alt="M5 Services" className="h-10 md:h-12 object-contain" />
        </a>

        <nav className="hidden md:flex items-center gap-8" data-testid="nav-desktop">
          {["about", "services", "clients"].map((section) => (
            <button
              key={section}
              data-testid={`link-nav-${section}`}
              onClick={() => scrollTo(section)}
              className={`text-sm font-medium uppercase tracking-widest transition-colors hover:text-primary ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              {section === "about" ? "Who We Are" : section === "clients" ? "Our Clients" : "Services"}
            </button>
          ))}
          <button
            data-testid="button-nav-contact"
            onClick={() => scrollTo("contact")}
            className="bg-primary text-white text-sm font-medium uppercase tracking-widest px-6 py-2.5 hover:bg-primary/90 transition-colors"
          >
            Get in Touch
          </button>
        </nav>

        <button
          className="md:hidden p-2"
          data-testid="button-mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className={`w-6 flex flex-col gap-1.5 transition-all ${scrolled ? "" : "invert"}`}>
            <span className={`h-0.5 bg-foreground transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`h-0.5 bg-foreground transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 bg-foreground transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-b border-border px-6 pb-6 flex flex-col gap-4" data-testid="nav-mobile">
          {["about", "services", "clients", "contact"].map((section) => (
            <button
              key={section}
              data-testid={`link-mobile-${section}`}
              onClick={() => scrollTo(section)}
              className="text-left text-sm font-medium uppercase tracking-widest text-foreground hover:text-primary transition-colors py-1"
            >
              {section === "about" ? "Who We Are" : section === "clients" ? "Our Clients" : section === "contact" ? "Get in Touch" : "Services"}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section
      id="hero"
      data-testid="section-hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url(https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/e070c2dd-0e55-42c1-a59e-d4c32c463691/IMG_2055+%281%29.jpg)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <p
          data-testid="text-hero-eyebrow"
          className="text-primary text-sm md:text-base uppercase tracking-[0.3em] font-medium mb-6"
        >
          Full-Service Facility Maintenance
        </p>
        <h1
          data-testid="text-hero-heading"
          className="font-heading text-white text-4xl md:text-6xl lg:text-7xl leading-tight mb-8"
        >
          Elevating people and
          <br />
          properties, every day.
        </h1>
        <p
          data-testid="text-hero-sub"
          className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10"
        >
          Skilled professionals committed to responsive, client-focused, and quality-driven facility service on every job.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            data-testid="button-hero-contact"
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-primary text-white px-8 py-4 text-sm uppercase tracking-widest font-medium hover:bg-primary/90 transition-colors"
          >
            Get in Touch
          </button>
          <button
            data-testid="button-hero-services"
            onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
            className="border border-white text-white px-8 py-4 text-sm uppercase tracking-widest font-medium hover:bg-white/10 transition-colors"
          >
            Our Services
          </button>
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

function About() {
  return (
    <section
      id="about"
      data-testid="section-about"
      className="py-24 md:py-32 bg-white"
    >
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4" data-testid="text-about-eyebrow">
            Who We Are
          </p>
          <h2
            data-testid="text-about-heading"
            className="font-heading text-4xl md:text-5xl text-foreground mb-6 leading-tight"
          >
            Built by people who know buildings.
          </h2>
          <p data-testid="text-about-body" className="text-muted-foreground text-lg leading-relaxed mb-6">
            M5 Services was founded by partners with deep roots in both Property Ownership and Construction, giving us a unique understanding of what buildings — and their managers — need every day. We saw the gaps in traditional service models and recognized that the tasks often overlooked or underserved are the ones that matter most to facility performance.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            By focusing on high-quality solutions for this essential, everyday work, we've turned what is typically a pain point for Property and Facility Managers into our specialty. Our team is made up of skilled, trained professionals who are hands-on problem solvers — committed to delivering responsive, client-focused, and quality-driven service on every job.
          </p>
        </div>
        <div className="relative">
          <img
            data-testid="img-about-team"
            src="https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/e070c2dd-0e55-42c1-a59e-d4c32c463691/IMG_2055+%281%29.jpg"
            alt="M5 Services team"
            className="w-full object-cover aspect-[4/3]"
          />
          <div className="absolute -bottom-6 -left-6 bg-primary text-white p-6 hidden md:block">
            <div className="font-heading text-3xl">10+</div>
            <div className="text-sm text-white/80 uppercase tracking-widest mt-1">Years Experience</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const [active, setActive] = useState(SERVICES[0].id);
  const activeService = SERVICES.find((s) => s.id === active) || SERVICES[0];

  return (
    <section
      id="services"
      data-testid="section-services"
      className="py-24 md:py-32 bg-muted"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4" data-testid="text-services-eyebrow">
            What We Do
          </p>
          <h2
            data-testid="text-services-heading"
            className="font-heading text-4xl md:text-5xl text-foreground leading-tight"
          >
            Our Services
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-0 items-start">
          <div className="flex flex-col border-t border-border" data-testid="services-list">
            {SERVICES.map((service) => (
              <button
                key={service.id}
                data-testid={`button-service-${service.id}`}
                onClick={() => setActive(service.id)}
                className={`text-left px-0 py-6 border-b border-border flex items-center justify-between group transition-all ${
                  active === service.id ? "text-primary" : "text-foreground hover:text-primary"
                }`}
              >
                <span className="font-heading text-xl md:text-2xl">{service.title}</span>
                <svg
                  className={`w-5 h-5 flex-shrink-0 ml-4 transition-transform ${active === service.id ? "rotate-90" : "group-hover:translate-x-1"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <div className="md:pl-16 mt-8 md:mt-0 sticky top-24" data-testid="service-detail">
            <img
              key={activeService.id}
              data-testid={`img-service-${activeService.id}`}
              src={activeService.image}
              alt={activeService.title}
              className="w-full object-cover aspect-[4/3] mb-6"
            />
            <h3 data-testid="text-service-active-title" className="font-heading text-2xl text-foreground mb-3">
              {activeService.title}
            </h3>
            <p data-testid="text-service-active-description" className="text-muted-foreground text-lg leading-relaxed">
              {activeService.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Clients() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="clients"
      data-testid="section-clients"
      className="py-24 md:py-32 bg-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <p className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4" data-testid="text-clients-eyebrow">
          Our Clients
        </p>
        <h2
          data-testid="text-clients-heading"
          className="font-heading text-4xl md:text-5xl text-foreground leading-tight"
        >
          Trusted by industry leaders.
        </h2>
      </div>

      <div className="relative" data-testid="clients-carousel">
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="flex">
          <div ref={trackRef} className="animate-marquee flex items-center gap-12 whitespace-nowrap">
            {[...CLIENTS, ...CLIENTS].map((client, i) => (
              <div
                key={`${client.name}-${i}`}
                data-testid={`img-client-${i}`}
                className="flex-shrink-0 h-12 w-36 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              >
                <img
                  src={client.url}
                  alt={client.name}
                  className="max-h-12 max-w-[140px] object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section
      id="contact"
      data-testid="section-cta"
      className="relative py-32 md:py-40 overflow-hidden bg-black"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            "url(https://images.squarespace-cdn.com/content/v1/67f721a013f63b7943e3a178/d5c1f231-bad3-4608-af64-68f34fe9bff2/IMG_0968-2.jpg)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-6" data-testid="text-cta-eyebrow">
          Work With Us
        </p>
        <h2
          data-testid="text-cta-heading"
          className="font-heading text-white text-3xl md:text-5xl leading-tight mb-8"
        >
          We don't sell a service,<br />we sell an experience.
        </h2>
        <p data-testid="text-cta-body" className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          At M5 Services, we pride ourselves in being able to take care of your every need as quickly and as smoothly as possible.
        </p>
        <a
          data-testid="button-cta-contact"
          href="https://www.m5svcs.com/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-primary text-white px-10 py-4 text-sm uppercase tracking-widest font-medium hover:bg-primary/90 transition-colors"
        >
          Get in Touch
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer data-testid="footer" className="bg-foreground text-background py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <img src={logoPath} alt="M5 Services" className="h-10 object-contain brightness-0 invert" />
        <nav className="flex gap-8 text-sm text-white/60 uppercase tracking-widest">
          {["about", "services", "clients", "contact"].map((section) => (
            <button
              key={section}
              data-testid={`link-footer-${section}`}
              onClick={() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-white transition-colors"
            >
              {section === "about" ? "Who We Are" : section === "clients" ? "Our Clients" : section === "contact" ? "Get in Touch" : "Services"}
            </button>
          ))}
        </nav>
        <p className="text-sm text-white/40" data-testid="text-footer-copy">
          &copy; {new Date().getFullYear()} M5 Services. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen" data-testid="page-home">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Clients />
      <CtaSection />
      <Footer />
    </div>
  );
}

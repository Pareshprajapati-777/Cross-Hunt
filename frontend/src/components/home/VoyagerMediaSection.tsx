import React from 'react';
import { Star, Award, ShieldCheck } from 'lucide-react';

interface VoyagerStory {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  rating: number;
  vessel: string;
  image: string;
}

const STORIES: VoyagerStory[] = [
  {
    id: 'story-1',
    name: 'Vikramaditya Singhania',
    role: 'Apex Capital Partners',
    location: 'Mumbai to Goa Expedition',
    quote: 'Our annual corporate conclave on the Mandovi Sovereign was utterly world-class. From onboard champagne to the seamless jetty QR boarding, zero friction.',
    rating: 5,
    vessel: 'Apex Oceanic Sovereign',
    image: '/static/images/vessels/apex_oceanic_sovereign.jpg',
  },
  {
    id: 'story-2',
    name: 'Dr. Ananya & Rohit Sharma',
    role: 'Private Anniversary Charter',
    location: 'Havelock Island, Andaman',
    quote: 'Chartered a twin-hull catamaran for our 10th wedding anniversary in the Andamans. Sunset dolphin sightings and personal chef dining on deck!',
    rating: 5,
    vessel: 'Nautika Platinum Catamaran',
    image: '/static/images/vessels/nautika_catamaran.jpg',
  },
  {
    id: 'story-3',
    name: 'Meera Deshmukh & Friends',
    role: 'Birthday Sunset Party',
    location: 'Mandovi River, Goa',
    quote: 'Best party boat in Goa! The sound system was incredible, boat was spotlessly clean, and our captain was super polite and safety conscious.',
    rating: 5,
    vessel: 'Mandovi Royal Party Cruiser',
    image: '/static/images/vessels/mandovi_pride.jpg',
  },
];

export const VoyagerMediaSection: React.FC = () => {
  return (
    <section className="py-20 bg-[#f8f9fa] relative overflow-hidden border-t border-[#0284c7]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/30">
              <Award className="w-3.5 h-3.5 text-[#0284c7]" />
              Verified Traveler Stories
            </div>
            <h2 className="section-heading-more text-3xl sm:text-5xl font-black tracking-tight font-serif text-[#051833]">
              Loved Across Every Wave.
            </h2>
            <p className="text-slate-600 text-sm max-w-xl mt-2 font-medium">
              Over 3,400 completed sea trips with 100% verified departure guarantees and real-time slot confirmations.
            </p>
          </div>

          {/* Social Proof Rating Badge */}
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-[#0284c7]/20 shadow-md self-start md:self-auto">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="text-left border-l border-slate-200 pl-3">
              <span className="font-mono-numbers text-sm font-black text-[#051833] block">4.92 / 5.0</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">3,158+ Reviews</span>
            </div>
          </div>
        </div>

        {/* 3 Story Cards with High-Res Vessel Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STORIES.map((story) => (
            <div
              key={story.id}
              className="group overflow-hidden flex flex-col justify-between bg-white border border-[#0284c7]/20 hover:border-[#0284c7]/50 shadow-md hover:shadow-xl rounded-3xl transition-all duration-300"
            >
              {/* Media Container with Image */}
              <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-900">
                <img
                  src={story.image}
                  alt={story.vessel}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/static/images/vessels/cordelia_empress.jpg';
                  }}
                />
                
                {/* Subtle Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-[#051833]/30 to-transparent pointer-events-none" />

                {/* Top Bar: Vessel Tag + Verified Badge */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-20">
                  <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#0284c7] text-[10px] font-bold uppercase tracking-wider border border-[#0284c7]/20 shadow-sm">
                    {story.vessel}
                  </span>

                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>

                {/* Bottom Text Over Image */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white z-10">
                  <div className="flex items-center gap-1 text-amber-400 mb-1">
                    {[...Array(story.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-white font-semibold line-clamp-2 italic drop-shadow-sm">
                    "{story.quote}"
                  </p>
                </div>
              </div>

              {/* Card Footer with Passenger Profile & Location */}
              <div className="p-5 flex items-center justify-between bg-[#f8f9fa] border-t border-slate-100">
                <div>
                  <h4 className="font-heading-more text-sm font-black text-[#051833]">
                    {story.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {story.role} • <span className="text-[#0284c7] font-bold">{story.location}</span>
                  </p>
                </div>

                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function HighSpotsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .slide-in-left {
          animation: slideInLeft 1.5s ease-out forwards;
          animation-timeline: view();
          animation-range: entry 0% cover 70%;
        }
        
        .slide-in-right {
          animation: slideInRight 1.5s ease-out forwards;
          animation-timeline: view();
          animation-range: entry 0% cover 70%;
        }
      `}</style>
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1
          style={{ fontSize: '3rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' }}
        >
          High Spots
        </h1>
        <p
          style={{
            fontSize: '1.25rem',
            color: '#4b5563',
            maxWidth: '48rem',
            margin: '0 auto',
            lineHeight: '1.6',
          }}
        >
          Your insight into the most captivating and significant moments in literature, art, and
          culture.
        </p>
      </div>

      <section style={{ paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1rem' }}>
          {/* Section 1 - Image Left */}
          <div id="section-1" data-section style={{ padding: '4rem 0' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3rem',
                alignItems: 'center',
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative' }} className="slide-in-left">
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                  }}
                >
                  <img
                    src="/high-spots/Admiral-Michiel-Adriaensz.png"
                    alt="Admiral Michiel Adriaensz"
                    style={{ width: '100%', aspectRatio: '12/16', objectFit: 'contain' }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="slide-in-right">
                <div>
                  <h2
                    style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Admiral Michiel Adriaensz
                  </h2>
                  <div
                    style={{
                      height: '4px',
                      width: '64px',
                      background: 'linear-gradient(to right, #d97706, #eab308)',
                      borderRadius: '9999px',
                    }}
                  ></div>
                </div>

                <p
                  style={{
                    fontSize: '1.125rem',
                    color: '#4b5563',
                    lineHeight: '1.75',
                    marginTop: '1.5rem',
                  }}
                >
                  A prominent figure in Dutch naval history, Admiral Michiel Adriaensz was a key
                  leader during the 17th century. Known for his strategic prowess and leadership, he
                  played a crucial role in the Dutch Golden Age, particularly in the Anglo-Dutch
                  Wars.
                </p>

                <a
                  href="https://en.wikipedia.org/wiki/Michiel_Adriaensz_de_Ruyter"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '1rem 2rem',
                    background: 'linear-gradient(to right, #1f2937, #374151)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '0.5rem',
                    marginTop: '1.5rem',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Learn More
                  <svg
                    style={{ width: '1.25rem', height: '1.25rem', marginLeft: '0.5rem' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Section 2 - Image Right (reversed) */}
          <div id="section-2" data-section style={{ padding: '4rem 0' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3rem',
                alignItems: 'center',
              }}
            >
              {/* Content */}
              <div className="slide-in-left">
                <div>
                  <h2
                    style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Admiral Michiel Adriaensz
                  </h2>
                  <div
                    style={{
                      height: '4px',
                      width: '64px',
                      background: 'linear-gradient(to right, #d97706, #eab308)',
                      borderRadius: '9999px',
                    }}
                  ></div>
                </div>

                <p
                  style={{
                    fontSize: '1.125rem',
                    color: '#4b5563',
                    lineHeight: '1.75',
                    marginTop: '1.5rem',
                  }}
                >
                  A prominent figure in Dutch naval history, Admiral Michiel Adriaensz was a key
                  leader during the 17th century. Known for his strategic prowess and leadership, he
                  played a crucial role in the Dutch Golden Age, particularly in the Anglo-Dutch
                  Wars.
                </p>

                <a
                  href="https://en.wikipedia.org/wiki/Michiel_Adriaensz_de_Ruyter"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '1rem 2rem',
                    background: 'linear-gradient(to right, #1f2937, #374151)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '0.5rem',
                    marginTop: '1.5rem',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Learn More
                  <svg
                    style={{ width: '1.25rem', height: '1.25rem', marginLeft: '0.5rem' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>

              {/* Image */}
              <div style={{ position: 'relative' }} className="slide-in-right">
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                  }}
                >
                  <img
                    src="/high-spots/Admiral-Michiel-Adriaensz.png"
                    alt="Admiral Michiel Adriaensz"
                    style={{ width: '100%', aspectRatio: '12/16', objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

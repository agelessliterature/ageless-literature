import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Ageless Literature',
  description: 'Our commitment to accessibility for all users',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">
          Accessibility Statement
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="bg-white shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Commitment */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Commitment</h2>
            <p className="text-gray-700 leading-relaxed">
              Ageless Literature is committed to ensuring digital accessibility for people with
              disabilities. We continually improve the user experience for everyone and apply
              relevant accessibility standards to make our platform inclusive and usable.
            </p>
          </section>

          {/* Conformance */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Conformance Goals</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We aim to conform to the{' '}
              <strong>Web Content Accessibility Guidelines (WCAG) 2.1</strong> at the{' '}
              <strong>AA level</strong>. These guidelines explain how to make web content more
              accessible for people with a wide range of disabilities, including visual, auditory,
              physical, speech, cognitive, language, learning, and neurological impairments.
            </p>
            <p className="text-gray-700 leading-relaxed">
              While we strive for full compliance, we acknowledge that some areas of our site may
              not yet be fully accessible. We are actively working to identify and resolve any gaps.
            </p>
          </section>

          {/* Measures Taken */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Measures We Take</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Semantic HTML markup and proper heading hierarchy throughout the site</li>
              <li>Keyboard-navigable menus, modals, and interactive elements</li>
              <li>Descriptive alt text for product images and media</li>
              <li>Sufficient color contrast ratios for text and UI components</li>
              <li>Responsive design that adapts to different screen sizes and zoom levels</li>
              <li>ARIA labels on icons, buttons, and navigation elements</li>
              <li>Focus indicators for interactive elements</li>
            </ul>
          </section>

          {/* Known Limitations */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Known Limitations</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Despite our best efforts, some content may not yet be fully accessible:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Some older product images may lack descriptive alt text</li>
              <li>
                Third-party embedded content (e.g., payment forms, video players) may have limited
                accessibility features outside our control
              </li>
              <li>PDF documents uploaded by vendors may not be fully screen-reader compatible</li>
            </ul>
          </section>

          {/* Compatibility */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Browser &amp; Assistive Technology
            </h2>
            <p className="text-gray-700 leading-relaxed">
              This site is designed to be compatible with current versions of major browsers
              (Chrome, Firefox, Safari, Edge) and common assistive technologies including screen
              readers (VoiceOver, NVDA, JAWS) and screen magnifiers.
            </p>
          </section>

          {/* Feedback */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Feedback &amp; Contact</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We welcome your feedback on the accessibility of Ageless Literature. If you encounter
              any barriers or have suggestions for improvement, please contact us:
            </p>
            <div className="bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 space-y-1">
              <p>
                <strong>Email:</strong> accessibility@agelessliterature.com
              </p>
              <p>
                <strong>Response time:</strong> We will make every effort to respond within 5
                business days.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

/**
 * Floating Section Navigator
 * Vertical stack of translucent icon buttons for quick navigation
 */
const SectionNavigator = ({ sections }) => {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            // Offset for sticky header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    if (!sections || sections.length === 0) return null;

    return (
        <div className="section-navigator">
            {sections.map(({ id, icon, label }) => (
                <button
                    key={id}
                    className="section-navigator__btn"
                    onClick={() => scrollToSection(id)}
                    title={label}
                >
                    <span className="section-navigator__icon">{icon}</span>
                    {/* Optional: Show label on hover? For now just icon as requested */}
                </button>
            ))}
        </div>
    );
};

export default SectionNavigator;

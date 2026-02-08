import React from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import './NewspaperCard.css';

const NewspaperCard = ({ article, sourceName, isTranslated }) => {
    // Determine which title to show
    // If isTranslated is true, try to show title_en. Fallback to title.
    const displayTitle = isTranslated && article.title_en ? article.title_en : article.title;

    return (
        <article className="newspaper-card">
            {sourceName && <div className="newspaper-card__source">{sourceName}</div>}

            <h3 className="newspaper-card__title">
                <a href={article.link} target="_blank" rel="noopener noreferrer">
                    {displayTitle}
                </a>
            </h3>

            <div className="newspaper-card__footer">
                <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="newspaper-card__link"
                >
                    Read Full Story <FaExternalLinkAlt size={10} />
                </a>
            </div>
        </article>
    );
};

export default NewspaperCard;

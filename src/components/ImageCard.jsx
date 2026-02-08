import React, { useState } from 'react';
import './ImageCard.css';

export function ImageCard({ article, size = 'medium', onClick, href }) {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const placeholderImage = `https://via.placeholder.com/400x250/12171E/00D4AA?text=${encodeURIComponent(article.source)}`;

    const showImage = article.imageUrl && !imageError;

    const Tag = href ? 'a' : 'article';
    const props = href ? {
        href,
        target: '_blank',
        rel: 'noopener noreferrer'
    } : {};

    return (
        <Tag
            className={`image-card image-card--${size}`}
            onClick={onClick}
            {...props}
        >
            {showImage && (
                <div className="image-card__media">
                    {!imageLoaded && (
                        <div className="image-card__skeleton"></div>
                    )}
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className={`image-card__image ${imageLoaded ? 'loaded' : ''}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                    <div className="image-card__overlay">
                        <span className="image-card__source">{article.source}</span>
                    </div>
                </div>
            )}

            <div className="image-card__content">
                <h3 className="image-card__headline">{article.title}</h3>
                {article.summary && (
                    <p className="image-card__summary">
                        {article.summary.substring(0, 150)}...
                    </p>
                )}
                <div className="image-card__meta">
                    <span className="meta__time">{article.time}</span>
                    {article.sentiment && (
                        <span className={`meta__sentiment meta__sentiment--${article.sentiment.label}`}>
                            {article.sentiment.label === 'positive' ? '📈' :
                                article.sentiment.label === 'negative' ? '📉' : '�'}
                        </span>
                    )}
                </div>
            </div>
        </Tag>
    );
}

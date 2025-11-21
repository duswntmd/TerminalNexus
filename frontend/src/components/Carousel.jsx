import React, { useState, useEffect } from 'react';
import './Carousel.css';

const Carousel = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [items.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  if (!items || items.length === 0) {
    return <div className="carousel-placeholder">No images to display</div>;
  }

  return (
    <div className="carousel">
      <div 
        className="carousel-inner" 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {items.map((item, index) => (
          <div key={index} className="carousel-item">
            {item.image ? (
              <img src={item.image} alt={item.caption || `슬라이드 ${index + 1}`} />
            ) : (
              <div className="carousel-content-placeholder">
                <h2>{item.title || "슬라이드 제목"}</h2>
                <p>{item.description || "슬라이드 설명"}</p>
              </div>
            )}
            {item.caption && <div className="carousel-caption">{item.caption}</div>}
          </div>
        ))}
      </div>

      <div className="carousel-indicators">
        {items.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;

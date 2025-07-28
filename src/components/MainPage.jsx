import React, { useState, useEffect } from 'react';
import './MainPage.css';

const AgroFarm = () => {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    const createBubbles = () => {
      const newBubbles = [];
      for (let i = 0; i < 6; i++) {
        newBubbles.push({
          id: i,
          size: Math.random() * 60 + 20,
          left: Math.random() * 100,
          delay: Math.random() * 5,
          duration: Math.random() * 3 + 4,
        });
      }
      setBubbles(newBubbles);
    };
    createBubbles();
  }, []);

  return (
    <div className="main-container">
      <div className="background">
        <div className="background-overlay"></div>
      </div>

      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            animationDelay: `${bubble.delay}s`,
            animationDuration: `${bubble.duration}s`,
          }}
        />
      ))}

      <div className="content-left">
        <div className="content-wrapper">
          <h1 className="main-title">AgroFarm</h1>
          <p className="main-subtitle">
            для вас, кто выращивает будущее: мы объединяем природу и технологии,
            чтобы каждый ваш урожай был щедрее, земля — плодороднее, а труд — мудрее.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgroFarm;

import React, { useState, useEffect } from 'react';
import { ArrowRight, Upload, Zap } from 'lucide-react';

import './animations.css';

const RedirectPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const features = [
    { icon: <Upload className="w-8 h-8" />, text: "Subida rápida" },
    { icon: <Zap className="w-8 h-8" />, text: "Procesamiento instantáneo" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
      <div className={`relative bg-white p-12 rounded-2xl shadow-2xl transform transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-50 rounded-2xl filter blur-xl z-0"></div>
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
            Bienvenido a tu drive pirata de confianza
          </h1>
          <p className="text-2xl text-gray-600 mb-8">Estas a punto de subir tus archivos :)</p>
          
          <div className="flex justify-around mb-10">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col items-center transition-all duration-300 transform ${hoveredFeature === index ? 'scale-110' : 'scale-100'}`}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="text-indigo-600 mb-2">{feature.icon}</div>
                <span className="text-gray-800 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
          
          <a
            href="/upload"
            className="group flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-full text-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Comenzar ahora
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
        </div>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {[...Array(20)].map((_, index) => (
          <div
            key={index}
            className="absolute bg-white rounded-full opacity-20 animate-float"
            style={{
              width: `${Math.random() * 20 + 10}px`,
              height: `${Math.random() * 20 + 10}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default RedirectPage;
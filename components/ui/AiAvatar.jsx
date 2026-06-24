"use client";

import React from "react";
import Spritesheet from "react-responsive-spritesheet";

export default function AiAvatar({ size = 36, emotion, style }) {
  if (emotion) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, var(--primary-soft, #e1eef1) 0%, #fff 100%)",
          border: "1.5px solid var(--primary, #0d6e8c)",
          boxShadow: "0 2px 6px rgba(13,110,140,0.15)",
          flexShrink: 0,
          position: "relative",
          ...style
        }}
      >
        <img
          src={`/New folder/${emotion}.png`}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/New folder/mad.png";
          }}
          alt={`AI Assistant ${emotion}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }}
        />
      </div>
    );
  }

  // Frame size is 388 x 470.
  // Aspect ratio is 470 / 388 = 1.211
  // So for a given width (size), the height should be size * 1.211
  const height = size * 1.211;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--primary-soft, #e1eef1) 0%, #fff 100%)",
        border: "1.5px solid var(--primary, #0d6e8c)",
        boxShadow: "0 2px 6px rgba(13,110,140,0.15)",
        flexShrink: 0,
        position: "relative",
        ...style
      }}
    >
      <div
        style={{
          width: size,
          height: height,
          position: "absolute",
          top: "3%", // Slightly push down to center the face/head nicely in the circle
        }}
      >
        <Spritesheet
          image="/reader_aligned_sheet.png"
          widthFrame={388}
          heightFrame={470}
          steps={8}
          fps={1}
          autoplay={true}
          loop={true}
          style={{
            display: "block",
            width: "100%",
            height: "100%"
          }}
        />
      </div>
    </div>
  );
}

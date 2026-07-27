import { useState } from 'react'

// Imagenes fijas del banner (no vienen de Catalog.API: el modelo de producto
// solo soporta una imagen por producto, esto es solo decorativo).
const IMAGES = [
  'https://i5.walmartimages.com/seo/2-Pack-Maruchan-Instant-Lunch-Ramen-Noodle-Soup-Beef-Flavor-2-25-oz-Package-May-Vary_45dd0e53-b3b0-4365-8eab-dd192d1189e6.ac8738679e92a55aa11eb8261b3400c7.jpeg?odnHeight=640&odnWidth=640&odnBg=FFFFFF',
  'https://i5.walmartimages.com/asr/ebf7027d-536d-4a6b-a52f-b22910352ccb.7dafe331e1af955a3b9084be9733a58a.jpeg',
  'https://m.media-amazon.com/images/I/61IEPWe2JCL.jpg',
]

// Carrusel tipo "coverflow": siempre se muestran hasta 3 slots (prev/active/next)
// posicionados con CSS transforms (scale + rotateY) para simular profundidad 3D.
export default function ImageCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = (delta) => {
    setActiveIndex((current) => (current + delta + IMAGES.length) % IMAGES.length)
  }

  const getSlidePosition = (index) => {
    if (index === activeIndex) return 'active'
    const prevIndex = (activeIndex - 1 + IMAGES.length) % IMAGES.length
    const nextIndex = (activeIndex + 1) % IMAGES.length
    if (index === prevIndex) return 'prev'
    if (index === nextIndex) return 'next'
    return 'hidden'
  }

  return (
    <div className="carousel">
      <div className="carousel__stage">
        <button
          type="button"
          className="carousel__arrow"
          onClick={() => goTo(-1)}
          disabled={IMAGES.length < 2}
          aria-label="Imagen anterior"
        >
          ‹
        </button>

        <div className="carousel__track">
          {IMAGES.map((src, index) => (
            <div key={src} className={`carousel__slide carousel__slide--${getSlidePosition(index)}`}>
              <img src={src} alt={`Maruchan ${index + 1}`} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="carousel__arrow"
          onClick={() => goTo(1)}
          disabled={IMAGES.length < 2}
          aria-label="Imagen siguiente"
        >
          ›
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

// Imagenes fijas del banner (no vienen de Catalog.API: el modelo de producto
// solo soporta una imagen por producto, esto es solo decorativo).
const IMAGES = [
  {
    src: 'https://i5.walmartimages.com/seo/2-Pack-Maruchan-Instant-Lunch-Ramen-Noodle-Soup-Beef-Flavor-2-25-oz-Package-May-Vary_45dd0e53-b3b0-4365-8eab-dd192d1189e6.ac8738679e92a55aa11eb8261b3400c7.jpeg?odnHeight=640&odnWidth=640&odnBg=FFFFFF',
    label: 'Sabor res',
  },
  {
    src: 'https://i5.walmartimages.com/asr/ebf7027d-536d-4a6b-a52f-b22910352ccb.7dafe331e1af955a3b9084be9733a58a.jpeg',
    label: 'Combo familiar',
  },
  {
    src: 'https://m.media-amazon.com/images/I/61IEPWe2JCL.jpg',
    label: 'Edición picante',
  },
]

const AUTOPLAY_MS = 4500

// Carrusel simple de una sola imagen a la vez, con crossfade. Sin
// perspectiva 3D ni arrastre: solo avanza sola o con flechas/puntos.
export default function ImageCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = (delta) => {
    setActiveIndex((current) => (current + delta + IMAGES.length) % IMAGES.length)
  }

  useEffect(() => {
    if (paused || IMAGES.length < 2) return undefined
    const id = setInterval(() => goTo(1), AUTOPLAY_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  return (
    <div className="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="carousel__stage">
        <button type="button" className="carousel__arrow" onClick={() => goTo(-1)} aria-label="Imagen anterior">
          ‹
        </button>

        <div className="carousel__track">
          {IMAGES.map((image, index) => (
            <div
              key={image.src}
              className={`carousel__slide${index === activeIndex ? ' carousel__slide--active' : ''}`}
            >
              <img src={image.src} alt={image.label} draggable={false} />
            </div>
          ))}
          <span className="carousel__caption">{IMAGES[activeIndex].label}</span>
        </div>

        <button type="button" className="carousel__arrow" onClick={() => goTo(1)} aria-label="Siguiente imagen">
          ›
        </button>
      </div>

      <div className="carousel__dots">
        {IMAGES.map((image, index) => (
          <button
            key={image.src}
            type="button"
            className={`carousel__dot${index === activeIndex ? ' carousel__dot--active' : ''}`}
            aria-label={`Ir a ${image.label}`}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

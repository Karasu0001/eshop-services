import { useEffect, useRef, useState } from 'react'

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
    label: 'Edicion picante',
  },
]

const AUTOPLAY_MS = 4200
const DRAG_THRESHOLD = 50

// Carrusel tipo "coverflow" 3D: todas las imagenes se posicionan en el espacio
// segun su distancia (offset) al slide activo, usando perspective + rotateY +
// translateZ. Soporta autoplay, arrastre con mouse/touch y navegacion por dots.
export default function ImageCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isInteracting, setIsInteracting] = useState(false)
  const [drag, setDrag] = useState({ active: false, startX: 0, deltaX: 0 })
  const trackRef = useRef(null)

  const goTo = (delta) => {
    setActiveIndex((current) => (current + delta + IMAGES.length) % IMAGES.length)
  }

  // Autoplay: se pausa mientras el usuario interactua (hover, foco o arrastre).
  useEffect(() => {
    if (isInteracting || IMAGES.length < 2) return undefined
    const id = setInterval(() => goTo(1), AUTOPLAY_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInteracting])

  const getOffset = (index) => {
    const half = IMAGES.length / 2
    let diff = index - activeIndex
    if (diff > half) diff -= IMAGES.length
    if (diff < -half) diff += IMAGES.length
    return diff
  }

  const slideStyle = (offset) => {
    const dragOffset = drag.active ? drag.deltaX / 220 : 0
    const effective = offset - dragOffset
    const abs = Math.abs(effective)
    const visible = abs <= 2

    return {
      transform: `translateX(${effective * 56}%) translateZ(${-abs * 160}px) rotateY(${effective * -30}deg) scale(${Math.max(1 - abs * 0.2, 0.5)})`,
      opacity: visible ? Math.max(1 - abs * 0.4, 0) : 0,
      zIndex: 10 - Math.round(abs * 10) / 10,
      filter: abs < 0.05 ? 'none' : `brightness(${Math.max(1 - abs * 0.22, 0.55)}) saturate(${Math.max(1 - abs * 0.2, 0.7)})`,
      transition: drag.active ? 'none' : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease, filter 0.55s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }
  }

  const handlePointerDown = (event) => {
    setIsInteracting(true)
    setDrag({ active: true, startX: event.clientX, deltaX: 0 })
    trackRef.current?.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!drag.active) return
    setDrag((prev) => ({ ...prev, deltaX: event.clientX - prev.startX }))
  }

  const endDrag = () => {
    if (!drag.active) return
    if (drag.deltaX > DRAG_THRESHOLD) goTo(-1)
    else if (drag.deltaX < -DRAG_THRESHOLD) goTo(1)
    setDrag({ active: false, startX: 0, deltaX: 0 })
  }

  return (
    <div
      className="carousel"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => {
        setIsInteracting(false)
        endDrag()
      }}
    >
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

        <div
          className="carousel__track"
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onFocus={() => setIsInteracting(true)}
          onBlur={() => setIsInteracting(false)}
        >
          <div className="carousel__glow" aria-hidden="true" />
          {IMAGES.map((image, index) => {
            const offset = getOffset(index)
            return (
              <div
                key={image.src}
                className={`carousel__slide${offset === 0 ? ' carousel__slide--active' : ''}`}
                style={slideStyle(offset)}
                onClick={() => offset !== 0 && setActiveIndex(index)}
              >
                <img src={image.src} alt={image.label} draggable={false} />
                <span className="carousel__caption">{image.label}</span>
              </div>
            )
          })}
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
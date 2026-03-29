interface Props {
  rating: number
  size?: 'sm' | 'md' | 'lg'
}

export default function StarRating({ rating, size = 'md' }: Props) {
  const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5

  return (
    <span className={`${sizeMap[size]} leading-none`} style={{ color: 'hsl(var(--primary))' }}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return '★'
        if (i === full && half) return '½'
        return '☆'
      }).join('')}
    </span>
  )
}

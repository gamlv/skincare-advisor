// アプリのヘッダーコンポーネント

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
      <h1 className="text-center text-base font-semibold text-gray-800">
        {title}
      </h1>
    </header>
  )
}

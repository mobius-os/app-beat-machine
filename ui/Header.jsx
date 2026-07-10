import { S } from '../styles.js'

export function Header({ appId, online }) {
  const iconSrc = appId ? `/api/apps/${appId}/icon?size=64` : '/apps/beat-machine/icon-192.png'

  return (
    <header style={S.header}>
      <div style={S.titleRow}>
        <img
          src={iconSrc}
          alt=""
          width={30}
          height={30}
          style={S.appIcon}
          onError={(event) => {
            if (!appId && event.currentTarget.src.endsWith('/icon-192.png')) {
              event.currentTarget.src = './icon.png'
              return
            }
            event.currentTarget.style.display = 'none'
            const fallback = event.currentTarget.nextElementSibling
            if (fallback) fallback.style.display = 'flex'
          }}
        />
        <span style={{ ...S.logoFallback, display: 'none' }} aria-hidden="true">BM</span>
        <h1 style={S.title}>Beat Machine</h1>
      </div>
      {!online && <span style={S.offlinePill} role="status">Offline</span>}
    </header>
  )
}

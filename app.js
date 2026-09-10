const container = document.getElementById('containerQR')
const form = document.getElementById('qrForm')
const input = document.getElementById('qr-link')
const plate = document.getElementById('plate')
const statusEl = document.getElementById('status')
const statusText = statusEl.querySelector('.status-text')
const readout = document.getElementById('readout')
const pngBtn = document.getElementById('pngBtn')
const svgBtn = document.getElementById('svgBtn')
const copyBtn = document.getElementById('copyBtn')

const EC_LEVEL = 'M'
const RENDER_SIZE = 1024
const QR_DARK = '#0f1116'
const QR_LIGHT = '#ffffff'

let qr = null
let lastValue = ''
let lastPNG = null
let lastSVG = null

function setStatus(state, text) {
	statusEl.dataset.state = state
	statusText.textContent = text
}

function slug(value) {
	const cleaned = value
		.toLowerCase()
		.replace(/^https?:\/\//, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
	return cleaned || 'qrcode'
}

function getCanvas() {
	return container.querySelector('canvas')
}

function pngDataURL() {
	const canvas = getCanvas()
	if (canvas) return canvas.toDataURL('image/png')
	const img = container.querySelector('img')
	return img && img.src ? img.src : null
}

// qrcodejs has no SVG output — rebuild it from the module matrix it exposes.
function buildSVG() {
	try {
		const model = qr && qr._oQRCode
		const count = model.getModuleCount()
		const cell = 8
		const margin = 4
		const dim = (count + margin * 2) * cell
		let rects = ''
		for (let row = 0; row < count; row++) {
			for (let col = 0; col < count; col++) {
				if (!model.isDark(row, col)) continue
				const x = (col + margin) * cell
				const y = (row + margin) * cell
				rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}"/>`
			}
		}
		return (
			`<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" ` +
			`viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
			`<rect width="100%" height="100%" fill="${QR_LIGHT}"/>` +
			`<g fill="${QR_DARK}">${rects}</g></svg>`
		)
	} catch (err) {
		return null
	}
}

function moduleCount() {
	try {
		return qr._oQRCode.getModuleCount()
	} catch (err) {
		return 0
	}
}

function triggerDownload(href, filename) {
	const a = document.createElement('a')
	a.href = href
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
}

function flashDone(btn, label) {
	const span = btn.querySelector('span')
	if (!span.dataset.original) span.dataset.original = span.textContent
	span.textContent = label
	btn.classList.add('done')
	clearTimeout(btn._resetTimer)
	btn._resetTimer = setTimeout(() => {
		span.textContent = span.dataset.original
		btn.classList.remove('done')
	}, 1400)
}

form.addEventListener('submit', (event) => {
	event.preventDefault()

	const value = input.value.trim()
	if (!value) return

	if (typeof QRCode === 'undefined') {
		setStatus('error', 'error · library failed to load')
		return
	}

	setStatus('working', 'rendering…')

	try {
		if (!qr) {
			qr = new QRCode(container, {
				width: RENDER_SIZE,
				height: RENDER_SIZE,
				colorDark: QR_DARK,
				colorLight: QR_LIGHT,
				correctLevel: QRCode.CorrectLevel[EC_LEVEL],
			})
		}
		qr.makeCode(value)
	} catch (err) {
		// qrcodejs throws when the payload exceeds the largest QR version.
		setStatus('error', 'error · input too long for a QR code')
		return
	}

	lastValue = value
	lastPNG = pngDataURL()
	lastSVG = buildSVG()

	plate.dataset.empty = 'false'
	pngBtn.disabled = !lastPNG
	svgBtn.disabled = !lastSVG
	copyBtn.disabled = !(lastPNG || lastValue)

	const count = moduleCount()
	readout.textContent = count
		? `${count} × ${count} modules · EC ${EC_LEVEL}`
		: `${RENDER_SIZE} × ${RENDER_SIZE} px · EC ${EC_LEVEL}`

	setStatus('ready', 'ready · rendered')
})

input.addEventListener('input', () => {
	if (statusEl.dataset.state === 'error') setStatus('idle', 'ready · idle')
})

pngBtn.addEventListener('click', () => {
	if (!lastPNG) return
	triggerDownload(lastPNG, `quick-qr-${slug(lastValue)}.png`)
	flashDone(pngBtn, 'saved')
})

svgBtn.addEventListener('click', () => {
	if (!lastSVG) return
	const blob = new Blob([lastSVG], { type: 'image/svg+xml' })
	const url = URL.createObjectURL(blob)
	triggerDownload(url, `quick-qr-${slug(lastValue)}.svg`)
	setTimeout(() => URL.revokeObjectURL(url), 1000)
	flashDone(svgBtn, 'saved')
})

copyBtn.addEventListener('click', async () => {
	try {
		const canvas = getCanvas()
		let blob = null
		if (canvas) {
			blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
		} else if (lastPNG) {
			blob = await (await fetch(lastPNG)).blob()
		}

		if (blob && 'ClipboardItem' in window && navigator.clipboard?.write) {
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
			flashDone(copyBtn, 'copied')
			return
		}
		throw new Error('image clipboard unavailable')
	} catch (err) {
		try {
			await navigator.clipboard.writeText(lastValue)
			flashDone(copyBtn, 'copied text')
		} catch (fallbackErr) {
			setStatus('error', 'error · copy blocked by browser')
		}
	}
})

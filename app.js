const containerQR = document.getElementById('containerQR')
const form = document.getElementById('qrForm')
const input = document.getElementById('qr-link')

const QR = new QRCode(containerQR)

form.addEventListener('submit', e => {
	e.preventDefault()
	QR.makeCode(input.value)
})

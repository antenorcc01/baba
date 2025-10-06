const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Necessário para imagens de origem cruzada
    image.src = url;
  });

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = rotation * (Math.PI / 180);
  return {
    width: Math.abs(width * Math.cos(rotRad)) + Math.abs(height * Math.sin(rotRad)),
    height: Math.abs(width * Math.sin(rotRad)) + Math.abs(height * Math.cos(rotRad)),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = rotation * (Math.PI / 180);

  // Define o tamanho do canvas para corresponder à caixa delimitadora da imagem rotacionada
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translada a origem do canvas para o centro da imagem
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Obtém os dados da imagem cortada
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  // Redefine o canvas para o tamanho da imagem cortada
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Cola os dados cortados no novo canvas
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg', 0.95); // Formato JPEG com qualidade 95%
  });
}
import React, { useState, useRef, useEffect } from "react";
import ReactCrop, {
    centerCrop,
    makeAspectCrop,
    Crop,
    PixelCrop,
    convertToPixelCrop,
} from 'react-image-crop'
import AppModal from "../components/AppModal";
import { useDebounceEffect } from '../components/useDebounceEffect'
import { canvasPreview } from '../components/canvasPreview'
import axios from "axios";

function Home() {
    const imgRef = useRef(null)
    const hiddenAnchorRef = useRef(null)
    const previewCanvasRef = useRef(null)
    const blobUrlRef = useRef('')

    const [imgSrc, setImgSrc] = useState('')
    const [croppedImgSrc, setcroppedImgSrc] = useState(null)
    const [crop, setCrop] = useState(null)
    const [aspect, setAspect] = useState(1 / 1)
    const [scale, setScale] = useState(1)
    const [rotate, setRotate] = useState(0)
    const [completedCrop, setCompletedCrop] = useState()
    const [isModalOpen, setModalOpen] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null)

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    function centerAspectCrop(
        mediaWidth,
        mediaHeight,
        aspect,
    ) {
        return centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                aspect,
                mediaWidth,
                mediaHeight,
            ),
            mediaWidth,
            mediaHeight,
        )
    }

    function onSelectFile(e) {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined)
            const reader = new FileReader()
            reader.addEventListener('load', () =>
                setImgSrc(reader.result?.toString() || ''),
            )
            reader.readAsDataURL(e.target.files[0])
            setModalOpen(true)
            setcroppedImgSrc(e.target.files[0])
        }
    }

    function onImageLoad(e) {
        if (aspect) {
            const { width, height } = e.currentTarget
            setCrop(centerAspectCrop(width, height, aspect))
        }
    }

    async function onSaveCropClick() {
        const image = imgRef.current
        const previewCanvas = previewCanvasRef.current
        if (!image || !previewCanvas || !completedCrop) {
            throw new Error('Crop canvas does not exist')
        }

        previewCanvas.width = 1024;
        previewCanvas.height = 1024;

        const offscreen = new OffscreenCanvas(
            1024,
            1024,
        )
        const ctx = offscreen.getContext('2d')
        if (!ctx) {
            throw new Error('No 2d context')
        }

        ctx.drawImage(
            previewCanvas,
            0,
            0,
            previewCanvas.width,
            previewCanvas.height,
            0,
            0,
            offscreen.width,
            offscreen.height,
        )

        // You might want { type: "image/jpeg", quality: <0 to 1> } to
        // reduce image size
        const blob = await offscreen.convertToBlob({
            type: 'image/png',
        })

        // if (blobUrlRef.current) {
        //     URL.revokeObjectURL(blobUrlRef.current)
        // }
        blobUrlRef.current = URL.createObjectURL(blob)
        hiddenAnchorRef.current.href = blobUrlRef.current
        // hiddenAnchorRef.current.click()

        const imageFile = new File([blob], 'image.png', { type: 'image/png' });
        generateImage(imageFile);
        // handleCloseModal();
        // console.log(imageFile);
    }

    useDebounceEffect(
        async () => {
            if (
                completedCrop?.width &&
                completedCrop?.height &&
                imgRef.current &&
                previewCanvasRef.current
            ) {
                // We use canvasPreview as it's much faster than imgPreview.
                canvasPreview(
                    imgRef.current,
                    previewCanvasRef.current,
                    completedCrop,
                    scale,
                    rotate,
                )
            }
        },
        100,
        [completedCrop, scale, rotate],
    )


    const generateImage = async (imageSource) => {
        const engineId = 'stable-diffusion-xl-1024-v1-0'
        const apiHost = process.env.API_HOST ?? 'https://api.stability.ai'
        const apiKey = process.env.STABILITY_API_KEY ?? 'sk-cur1S9NxikotqjECKhJk8taNZMr7Y1zsWjQwrkHpCsmU7qbP'

        if (!apiKey) throw new Error('Missing Stability API key.')

        console.log({ croppedImgSrc });

        const formData = new FormData()
        formData.append('init_image', imageSource)
        formData.append('init_image_mode', 'IMAGE_STRENGTH')
        formData.append('image_strength', 0.35)
        formData.append('text_prompts[0][text]', 'outfit me as a sailor')
        formData.append('cfg_scale', 7)
        formData.append('samples', 1)
        formData.append('steps', 30)

        axios.post(`${apiHost}/v1/generation/${engineId}/image-to-image`, formData, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${apiKey}`,
            },
        })
            .then((response) => {
                console.log('Response:', response.data);
                const { artifacts } = response.data;
                setGeneratedImage(artifacts[0].base64)
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    return (
        <div>
            <AppModal isOpen={isModalOpen} onClose={handleCloseModal}>
                <div style={{ minWidth: '640px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ maxWidth: '360px' }}>
                        {!!imgSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspect}
                                minHeight={200}
                                maxWidth={400}
                            >
                                <img
                                    ref={imgRef}
                                    alt="Crop me"
                                    src={imgSrc}
                                    style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                                    onLoad={onImageLoad}
                                />
                            </ReactCrop>
                        )}

                        {!!completedCrop && (
                            <>
                                <div>
                                    <canvas
                                        ref={previewCanvasRef}
                                        style={{
                                            border: '1px solid black',
                                            objectFit: 'contain',
                                            width: completedCrop.width,
                                            height: completedCrop.height,
                                        }}
                                    />
                                </div>
                                <div>
                                    <button onClick={onSaveCropClick}>Save</button>
                                    <a
                                        href="#hidden"
                                        ref={hiddenAnchorRef}
                                        download
                                        style={{
                                            position: 'absolute',
                                            top: '-200vh',
                                            visibility: 'hidden',
                                        }}
                                    >
                                        Hidden download
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </AppModal>

            {generatedImage ? (
                <div style={{ maxWidth: '480px' }}>
                    <img src={`data:image/png;base64,${generatedImage}`} />
                </div>
            ) : null}

            <input type="file" accept="image/*" onChange={onSelectFile} />

        </div>
    );
}

export default Home;

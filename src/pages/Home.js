import axios from "axios";
import React, { useRef, useState } from "react";
import ReactCrop, {
    centerCrop,
    makeAspectCrop
} from 'react-image-crop';
import AppModal from "../components/AppModal";
import Spinner from "../components/Spinner";
import { canvasPreview } from '../components/canvasPreview';
import { useDebounceEffect } from '../components/useDebounceEffect';

function Home() {
    const imgRef = useRef(null)
    const hiddenAnchorRef = useRef(null)
    const previewCanvasRef = useRef(null)

    const [imgSrc, setImgSrc] = useState('')
    const [crop, setCrop] = useState(null)
    const [aspect, setAspect] = useState(1 / 1)
    const [scale, setScale] = useState(1)
    const [rotate, setRotate] = useState(0)
    const [completedCrop, setCompletedCrop] = useState()
    const [isModalOpen, setModalOpen] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null)
    const [isloading, setIsloading] = useState(false);

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

        const offscreen = new OffscreenCanvas(1024, 1024)
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

        const blob = await offscreen.convertToBlob({
            type: 'image/png',
        })

        const imageFile = new File([blob], 'image.png', { type: 'image/png' });
        generateImage(imageFile);
        handleCloseModal();
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

        setIsloading(true);

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
            }).finally(() => {
                setIsloading(false)
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

            {isloading ? (<Spinner />) : (
                <>
                    {generatedImage ? (
                        <div style={{ maxWidth: '480px' }}>
                            <img src={`data:image/png;base64,${generatedImage}`} />
                        </div>
                    ) : (
                        <input type="file" accept="image/*" onChange={onSelectFile} />
                    )}
                </>
            )}

        </div>
    );
}

export default Home;

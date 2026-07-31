import base64
from urllib.parse import urljoin

from src.core.config import settings
from src.core.logging import logger
from src.models.providers import ImageGenerationResult


class GeminiService:
    def generate_mindmap_image(self, prompt: str) -> ImageGenerationResult:
        api_url = settings.vlearn_mindmap_image_api_url.strip()
        if api_url:
            remote_result = self._generate_via_remote_api(api_url, prompt)
            if remote_result is not None:
                return remote_result
            return ImageGenerationResult(
                status="error",
                model=f"remote:{api_url.rstrip('/')}",
                image_data_url=None,
                note="Remote mindmap image API khong tao duoc anh. Kiem tra URL, prompt hoac log Colab.",
            )

        if not settings.gemini_api_key:
            return ImageGenerationResult(
                status="unavailable",
                model=settings.vlearn_mindmap_image_model,
                image_data_url=None,
                note="Chua tao duoc anh mindmap. Kiem tra GEMINI_API_KEY hoac remote image API.",
            )

        try:
            from google import genai
        except ImportError:
            logger.exception("google-genai is not installed")
            return ImageGenerationResult(
                status="unavailable",
                model=settings.vlearn_mindmap_image_model,
                image_data_url=None,
                note="Chua tao duoc anh mindmap. Thieu package Google GenAI.",
            )

        try:
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model=settings.vlearn_mindmap_image_model,
                contents=prompt,
            )
            image_bytes: bytes | None = None

            for candidate in getattr(response, "candidates", None) or []:
                content = getattr(candidate, "content", None)
                for part in getattr(content, "parts", None) or []:
                    inline_data = getattr(part, "inline_data", None)
                    if inline_data and getattr(inline_data, "data", None):
                        image_bytes = inline_data.data
                        break
                if image_bytes:
                    break

            if not image_bytes:
                logger.warning("Gemini image response did not contain inline image bytes.")
                return ImageGenerationResult(
                    status="unavailable",
                    model=settings.vlearn_mindmap_image_model,
                    image_data_url=None,
                    note="Gemini khong tra ve du lieu anh hop le.",
                )

            encoded = base64.b64encode(image_bytes).decode("ascii")
            return ImageGenerationResult(
                status="success",
                model=settings.vlearn_mindmap_image_model,
                image_data_url=f"data:image/png;base64,{encoded}",
                note="Da tao anh mindmap bang Gemini image model.",
            )
        except Exception:
            logger.exception("Gemini mindmap image generation failed")
            return ImageGenerationResult(
                status="error",
                model=settings.vlearn_mindmap_image_model,
                image_data_url=None,
                note="Loi khi goi Gemini de tao anh mindmap.",
            )

    def _generate_via_remote_api(self, api_url: str, prompt: str) -> ImageGenerationResult | None:
        try:
            import requests
        except ImportError:
            logger.exception("requests is not installed")
            return None

        normalized_url = api_url.rstrip("/")
        endpoint = normalized_url if normalized_url.endswith("/generate") else f"{normalized_url}/generate"
        remote_prompt = prompt.strip()[:1900]
        try:
            response = requests.post(
                endpoint,
                json={
                    "prompt": remote_prompt,
                    "negative_prompt": "blurry, low quality, distorted text, unreadable text",
                    "steps": 15,
                },
                timeout=180,
            )
            response.raise_for_status()
            content_type = response.headers.get("content-type", "image/png")
            seed = response.headers.get("x-seed")
            elapsed_ms = response.headers.get("x-generation-time-ms")
            note_parts = ["Da tao anh mindmap bang TinySD-lite API"]
            if seed:
                note_parts.append(f"seed={seed}")
            if elapsed_ms:
                note_parts.append(f"time_ms={elapsed_ms}")
            return self._remote_response_to_result(
                requests=requests,
                api_url=normalized_url,
                response=response,
                content_type=content_type,
                note=", ".join(note_parts),
            )
        except Exception:
            logger.exception("Remote mindmap image API call failed")
            return None

    def _remote_response_to_result(
        self,
        requests: object,
        api_url: str,
        response: object,
        content_type: str,
        note: str,
    ) -> ImageGenerationResult:
        if content_type.lower().startswith("image/"):
            return self._image_bytes_to_result(
                model=f"remote:{api_url}",
                image_bytes=response.content,
                mime_type=content_type.split(";")[0],
                note=note,
            )

        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Remote image API did not return image bytes or JSON object.")

        data_url = payload.get("image_data_url") or payload.get("data_url")
        if isinstance(data_url, str) and data_url.startswith("data:image/"):
            return ImageGenerationResult(
                status="success",
                model=f"remote:{api_url}",
                image_data_url=data_url,
                mime_type=data_url.split(";", 1)[0].replace("data:", "") or "image/png",
                note=note,
            )

        encoded_image = payload.get("image_base64") or payload.get("b64_json")
        if isinstance(encoded_image, str) and encoded_image.strip():
            mime_type = str(payload.get("mime_type") or "image/png")
            return ImageGenerationResult(
                status="success",
                model=f"remote:{api_url}",
                image_data_url=f"data:{mime_type};base64,{encoded_image.strip()}",
                mime_type=mime_type,
                note=note,
            )

        image_url = payload.get("image_url") or payload.get("url")
        if isinstance(image_url, str) and image_url.strip():
            resolved_url = urljoin(f"{api_url}/", image_url.strip())
            image_response = requests.get(resolved_url, timeout=180)
            image_response.raise_for_status()
            downloaded_type = image_response.headers.get("content-type", "image/png").split(";")[0]
            return self._image_bytes_to_result(
                model=f"remote:{api_url}",
                image_bytes=image_response.content,
                mime_type=downloaded_type,
                note=f"{note}, downloaded_image_url={resolved_url}",
            )

        raise ValueError("Remote image API JSON did not include image_data_url, base64, or image_url.")

    def _image_bytes_to_result(
        self,
        model: str,
        image_bytes: bytes,
        mime_type: str,
        note: str,
    ) -> ImageGenerationResult:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return ImageGenerationResult(
            status="success",
            model=model,
            image_data_url=f"data:{mime_type};base64,{encoded}",
            mime_type=mime_type,
            note=note,
        )

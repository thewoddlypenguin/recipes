from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.security import require_roles
from app.schemas.upload import UploadResponse
from app.services.images import MAX_UPLOAD_BYTES, save_uploaded_image

router = APIRouter()


@router.post("/uploads/images", response_model=UploadResponse)
def upload_image(
    file: UploadFile = File(...),
    recipe_slug: str | None = Form(None),
    _user=Depends(require_roles("admin", "editor")),
) -> UploadResponse:
    contents = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large (10 MB max)")

    # Verify it is a real image, regardless of the file extension.
    try:
        Image.open(BytesIO(contents)).verify()
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is not a valid image")

    try:
        _, public_url = save_uploaded_image(contents, file.filename or "", recipe_slug)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return UploadResponse(url=public_url, filename=public_url.rsplit("/", 1)[-1])
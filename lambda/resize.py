import boto3
import os
from PIL import Image
import io

s3 = boto3.client("s3")

THUMBNAIL_SIZE = (400, 400)

def lambda_handler(event, context):
    bucket = event["Records"][0]["s3"]["bucket"]["name"]
    key = event["Records"][0]["s3"]["object"]["key"]

    if not key.startswith("photos/"):
        print(f"Skipping non-photo key: {key}")
        return

    print(f"Processing: s3://{bucket}/{key}")

    response = s3.get_object(Bucket=bucket, Key=key)
    image_data = response["Body"].read()

    image = Image.open(io.BytesIO(image_data))
    image.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)

    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    buffer.seek(0)

    filename = os.path.basename(key)
    thumbnail_key = f"thumbnails/{filename}"

    s3.put_object(
        Bucket=bucket,
        Key=thumbnail_key,
        Body=buffer,
        ContentType="image/jpeg",
    )

    print(f"Thumbnail saved to: s3://{bucket}/{thumbnail_key}")
    return {"statusCode": 200, "body": f"Thumbnail created: {thumbnail_key}"}

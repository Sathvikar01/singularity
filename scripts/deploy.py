"""Publish the verified dist build to the user's static Hugging Face Space."""
from pathlib import Path
import sys
from huggingface_hub import HfApi

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
if not (dist / 'index.html').exists():
    raise SystemExit('Run npm run build before deployment.')
api = HfApi()
repo = 'sankalphs/singularity'
api.create_repo(repo, repo_type='space', space_sdk='static', exist_ok=True)
(dist / 'README.md').write_text((root / 'README.md').read_text(encoding='utf-8'), encoding='utf-8')
info = api.upload_folder(repo_id=repo, repo_type='space', folder_path=str(dist),
    delete_patterns=['assets/*'], commit_message=sys.argv[1] if len(sys.argv)>1 else 'Deploy verified game build')
print(info.commit_url)
print('https://huggingface.co/spaces/' + repo)

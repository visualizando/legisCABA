"""Configura Pages y lee despliegues con la credencial de Git, sin imprimir secretos."""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

REPO='visualizando/legisCABA'


def main():
    env={**os.environ,'GIT_TERMINAL_PROMPT':'0','GCM_INTERACTIVE':'Never'}
    result=subprocess.run(['git','credential','fill'],input=b'protocol=https\nhost=github.com\n\n',capture_output=True,env=env,timeout=25)
    fields=dict(line.split('=',1) for line in result.stdout.decode('utf-8').splitlines() if '=' in line)
    token=fields.get('password')
    if not token:
        raise RuntimeError('No hay credencial GitHub disponible en el helper de Git')
    def api(path,method='GET',body=None):
        request=urllib.request.Request('https://api.github.com/repos/'+REPO+path,
            data=json.dumps(body).encode() if body is not None else None,method=method,
            headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json',
                     'X-GitHub-Api-Version':'2022-11-28','User-Agent':'legisCABA-setup'})
        with urllib.request.urlopen(request,timeout=30) as response:
            raw=response.read()
            return json.loads(raw) if raw else {}
    if len(sys.argv)>1 and sys.argv[1]=='enable':
        try:
            state=api('/pages')
        except urllib.error.HTTPError as exc:
            if exc.code!=404: raise
            state=api('/pages','POST',{'build_type':'workflow','source':{'branch':'main','path':'/'}})
        if state.get('build_type')!='workflow':
            state=api('/pages','PUT',{'build_type':'workflow'}) or api('/pages')
        print(json.dumps({'pages_url':state.get('html_url'),'build_type':state.get('build_type'),'status':state.get('status')}))
    elif len(sys.argv)>1 and sys.argv[1]=='dispatch':
        api('/actions/workflows/publicar.yml/dispatches','POST',{'ref':'main'})
        print('Publicación solicitada para main')
    else:
        runs=api('/actions/runs?per_page=5')['workflow_runs']
        print(json.dumps([{'id':r['id'],'name':r['name'],'status':r['status'],'conclusion':r['conclusion'],'url':r['html_url']} for r in runs]))


if __name__=='__main__': main()

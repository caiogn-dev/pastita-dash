import { urlSegura } from '../urlSegura';

describe('urlSegura', () => {
  it('aceita http, https e caminho relativo', () => {
    expect(urlSegura('https://a.com/x.pdf')).toBe('https://a.com/x.pdf');
    expect(urlSegura('http://a.com')).toBe('http://a.com');
    expect(urlSegura('//cdn.a.com/x')).toBe('//cdn.a.com/x');
    expect(urlSegura('/media/x.png')).toBe('/media/x.png');
  });
  it('bloqueia esquemas perigosos, inclusive disfarçados', () => {
    expect(urlSegura('javascript:alert(1)')).toBeUndefined();
    expect(urlSegura('  JavaScript:alert(1)')).toBeUndefined();
    expect(urlSegura('java\tscript:alert(1)')).toBeUndefined();
    expect(urlSegura('data:text/html,<script>1</script>')).toBeUndefined();
    expect(urlSegura('vbscript:x')).toBeUndefined();
  });
  it('vazio e nulo viram undefined', () => {
    expect(urlSegura('')).toBeUndefined();
    expect(urlSegura(null)).toBeUndefined();
    expect(urlSegura(undefined)).toBeUndefined();
  });
});

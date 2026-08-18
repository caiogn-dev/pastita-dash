import { parseCoords } from '../parseCoords';

describe('parseCoords', () => {
  it('link do Maps com query=lat,lng (encodado %2C)', () => {
    const url = 'https://www.google.com/maps/search/?api=1&query=-10.21659%2C-48.33439';
    expect(parseCoords(url)).toEqual({ lat: -10.21659, lng: -48.33439 });
  });

  it('link do Maps com query=lat,lng (vírgula literal)', () => {
    expect(parseCoords('https://maps.google.com/?q=-10.216,-48.334')).toEqual({ lat: -10.216, lng: -48.334 });
  });

  it('link do Maps com @lat,lng,zoom', () => {
    expect(parseCoords('https://www.google.com/maps/@-10.21659,-48.33439,17z')).toEqual({ lat: -10.21659, lng: -48.33439 });
  });

  it('"lat,lng" cru', () => {
    expect(parseCoords('-10.21659, -48.33439')).toEqual({ lat: -10.21659, lng: -48.33439 });
  });

  it('endereço de texto comum NÃO vira coordenada', () => {
    expect(parseCoords('Rua das Flores, 123, Palmas-TO')).toBeNull();
    expect(parseCoords('Secretaria da segurança publica')).toBeNull();
  });

  it('número de rua "Quadra 501, 403" não casa', () => {
    expect(parseCoords('Quadra 501, 403')).toBeNull();
  });

  it('shortlink não é resolvível → null', () => {
    expect(parseCoords('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
  });

  it('vazio → null', () => {
    expect(parseCoords('')).toBeNull();
    expect(parseCoords('   ')).toBeNull();
  });
});

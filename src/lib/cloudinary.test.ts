import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOptimizedImageUrl, buildCloudinarySrcSet } from './cloudinary.ts';

test('buildOptimizedImageUrl: returns empty string for null, undefined, or empty values', () => {
  assert.equal(buildOptimizedImageUrl(null), '');
  assert.equal(buildOptimizedImageUrl(undefined), '');
  assert.equal(buildOptimizedImageUrl('   '), '');
});

test('buildOptimizedImageUrl: returns non-Cloudinary URLs and local paths unchanged', () => {
  const local = '/agrobaba-logo.png';
  assert.equal(buildOptimizedImageUrl(local), local);

  const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  assert.equal(buildOptimizedImageUrl(dataUri), dataUri);

  const external = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea';
  assert.equal(buildOptimizedImageUrl(external), external);
});

test('buildOptimizedImageUrl: inserts f_auto,q_auto and width transformations on Cloudinary upload URLs', () => {
  const input = 'https://res.cloudinary.com/agrobaba/image/upload/v1726000000/products/tomatoes.jpg';
  const result = buildOptimizedImageUrl(input, { width: 400 });

  assert.equal(
    result,
    'https://res.cloudinary.com/agrobaba/image/upload/f_auto,q_auto,c_limit,w_400/v1726000000/products/tomatoes.jpg'
  );
});

test('buildOptimizedImageUrl: handles width, height, and fill crop', () => {
  const input = 'https://res.cloudinary.com/agrobaba/image/upload/v1726000000/products/goat.jpg';
  const result = buildOptimizedImageUrl(input, { width: 300, height: 300, crop: 'fill' });

  assert.equal(
    result,
    'https://res.cloudinary.com/agrobaba/image/upload/f_auto,q_auto,c_fill,w_300,h_300/v1726000000/products/goat.jpg'
  );
});

test('buildCloudinarySrcSet: generates responsive srcset with multiple breakpoints', () => {
  const input = 'https://res.cloudinary.com/agrobaba/image/upload/v1726000000/products/pepper.jpg';
  const srcset = buildCloudinarySrcSet(input, [320, 640]);

  assert.ok(srcset);
  assert.ok(srcset.includes('w_320/v1726000000/products/pepper.jpg 320w'));
  assert.ok(srcset.includes('w_640/v1726000000/products/pepper.jpg 640w'));
});

test('buildCloudinarySrcSet: returns undefined for non-Cloudinary images', () => {
  assert.equal(buildCloudinarySrcSet('/placeholder.png'), undefined);
  assert.equal(buildCloudinarySrcSet(null), undefined);
});


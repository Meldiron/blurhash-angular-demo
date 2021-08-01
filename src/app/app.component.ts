import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { encode, decode } from 'blurhash';

type BlurhashImage = {
  // Blurhash related data
  hash?: string;
  width?: number;
  height?: number;

  // Image relate data
  name: string;
  url: string;
  originalSize?: number;
};
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  images: BlurhashImage[] = [
    {
      name: 'Fastest car ever 💪',
      url: 'https://images.unsplash.com/photo-1627392689954-0a4d150687a7?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    },
    {
      name: "Let's eat 🍉",
      url: 'https://images.unsplash.com/photo-1627308595127-d9acf19107ce?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=675&q=80',
    },
    {
      name: "Who doesn't love dogs 🐶",
      url: 'https://images.unsplash.com/photo-1627366247844-b4b5df8854d8?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80',
    },
    {
      name: 'We love cats too 😻',
      url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80',
    },
  ];

  constructor(private cdRef: ChangeDetectorRef) {}

  async ngAfterViewInit() {
    // Calculate original image size
    for (const image of this.images) {
      const fileSize = await new Promise<number>((resolve, _reject) => {
        var http = new XMLHttpRequest();
        http.open('HEAD', image.url, true);
        http.onreadystatechange = function () {
          if (this.readyState == this.DONE) {
            if (this.status === 200) {
              const fileSize = this.getResponseHeader('content-length');
              resolve(fileSize ? +fileSize : 0);
            }
          }
        };
        http.send();
      });
      image.originalSize = fileSize;
    }

    // Timeout before bluring to show original images
    await new Promise<void>((resolve, _reject) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });

    // Generate blurhashes. This will be done when uploading an image to a storage
    let imageLoopIndex = 0;
    for (const image of this.images) {
      const blurhashData = await this.generateBlurhash(image.url);

      image.hash = blurhashData.hash;
      image.height = blurhashData.height;
      image.width = blurhashData.width;

      // Once hash is applied, wait for Angular to render canvas from *ngIf and fill it with blured content
      this.cdRef.detectChanges();

      const blurhashCanvas: HTMLCanvasElement = <HTMLCanvasElement>(
        document.getElementById(`blurhash_canvas_${imageLoopIndex}`)
      );
      const blurhashPixels = decode(image.hash, image.width, image.height);
      const ctx = blurhashCanvas?.getContext('2d');
      const imageData = ctx?.createImageData(image.width, image.height);

      if (!imageData) {
        throw Error('Could not prepare Blurhash canvas');
      }

      imageData.data.set(blurhashPixels);
      ctx?.putImageData(imageData, 0, 0);

      imageLoopIndex++;

      // tiny timeout to make it easier to see what is happening
      await new Promise<void>((resolve, _reject) => {
        setTimeout(() => {
          resolve();
        }, 150);
      });
    }
  }

  private async generateBlurhash(imageUrl: string): Promise<{
    hash: string;
    width: number;
    height: number;
  }> {
    const loadedImageObject = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', '');
        img.onload = () => resolve(img);
        img.onerror = (...args) => reject(args);
        img.src = imageUrl;
      }
    );

    const canvas = document.createElement('canvas');
    canvas.width = loadedImageObject.width;
    canvas.height = loadedImageObject.height;
    const context = canvas.getContext('2d');
    context?.drawImage(loadedImageObject, 0, 0);
    const imageData = context?.getImageData(
      0,
      0,
      loadedImageObject.width,
      loadedImageObject.height
    );

    if (!imageData) {
      throw Error('Could not render an image.');
    }

    return {
      hash: encode(imageData.data, imageData.width, imageData.height, 4, 4),
      width: loadedImageObject.width,
      height: loadedImageObject.height,
    };
  }
}

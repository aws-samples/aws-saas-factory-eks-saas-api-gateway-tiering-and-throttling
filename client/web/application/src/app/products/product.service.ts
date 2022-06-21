/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Product } from './models/product.interface';
import { environment } from '../../environments/environment';
import { Auth } from 'aws-amplify';
import { map, take, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  baseUrl: string;

  constructor(private http: HttpClient) {
    const s = Auth.currentSession().catch((err) => console.log(err));
    const session$ = from(s);

    const idToken$ = session$.pipe(map((sesh) => sesh && sesh.getIdToken()));
    const path$ = idToken$.pipe(map((t) => t.payload['custom:path']));
    const plan$ = idToken$.pipe(map((t) => t.payload['custom:plan']));
    plan$.pipe(take(1)).subscribe(value => {
      if (value === 'basic' || value === 'standard') {
        this.baseUrl = `${environment.restApiUrl}/app/api/products`;
      } else if (value === 'premium') {
        path$.pipe(take(1)).subscribe(pathValue => {
          this.baseUrl = `${environment.restApiUrl}/` + pathValue + '/api/products';
        });
      }
    });
  }


  fetch(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }

  get(productId: string): Observable<Product> {
    const url = `${this.baseUrl}/${productId}`;
    return this.http.get<Product>(url);
  }

  delete(product: Product) {
    const url = `${this.baseUrl}/${product.product_id}`;
    return this.http.delete<Product>(url);
  }

  patch(product: Product) {
    const url = `${this.baseUrl}/${product.product_id}`;
    return this.http.patch<Product>(url, product);
  }

  post(product: Product) {
    return this.http.post<Product>(this.baseUrl, product);
  }
}

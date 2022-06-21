/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from} from 'rxjs';
import { Order } from './models/order.interface';
import { filter, map, take } from 'rxjs/operators';
import { Auth } from 'aws-amplify';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  orders: Order[] = [];
  baseUrl: string;
  constructor(private http: HttpClient) {
    const s = Auth.currentSession().catch((err) => console.log(err));
    const session$ = from(s);
    const idToken$ = session$.pipe(map((sesh) => sesh && sesh.getIdToken()));
    const path$ = idToken$.pipe(map((t) => t.payload['custom:path']));
    const plan$ = idToken$.pipe(map((t) => t.payload['custom:plan']));
    plan$.pipe(take(1)).subscribe(value => {
      if (value === 'basic' || value === 'standard') {
        this.baseUrl = `${environment.restApiUrl}/app/api/orders`;
      } else if (value === 'premium') {
        path$.pipe(take(1)).subscribe(pathValue => {
          this.baseUrl = `${environment.restApiUrl}/` + pathValue + '/api/orders';
        });
      }
    });
  }

  fetch(): Observable<Order[]> {
    return this.http.get<Order[]>(this.baseUrl);
  }

  get(orderId: string): Observable<Order> {
    const url = `${this.baseUrl}/${orderId}`;
    return this.http.get<Order>(url);
  }

  create(order: Order): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, order);
  }
}

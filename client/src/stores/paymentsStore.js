import {makeAutoObservable} from "mobx";
import {api} from "../api/http";
import {userStore} from "./userStore";

class PaymentsStore{
  list=[];
  advice=null;

  constructor(){
    makeAutoObservable(this);
  }

  async load(){
    const {data}=await api.get(`/payments/${userStore.userId}`);
    this.list=data;
  }

  async create(amount,description){
    await api.post(`/payments/${userStore.userId}`,{amount,description});
    this.load();
  }

  async askAdvice(paymentId){
    const {data}=await api.get(`/payments/advice/${paymentId}`);
    this.advice=data.ai;
  }

  async confirm(id){
    await api.post(`/payments/confirm/${id}`);
    this.load();
  }

  async reject(id){
    await api.post(`/payments/reject/${id}`);
    this.load();
  }
}

export const paymentsStore = new PaymentsStore();

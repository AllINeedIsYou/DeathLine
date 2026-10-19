from fastapi import FastAPI
from api import router
from fastapi.middleware.cors import CORSMiddleware

origins=['http://127.0.0.1:5173','http://localhost:5173']

app=FastAPI()
app.include_router(router)


app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['GET','PUT','POST','DELETE','OPTIONS','PATCH'],allow_headers=["Content-Type"])
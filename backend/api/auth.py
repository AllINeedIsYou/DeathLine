
from fastapi import APIRouter, Response,Request,Depends,HTTPException
from .shemas import UserCreateSchema,UserResponseSchema,UserLoginSchema,EmailVerificationConfirmSchema,UserUpdateSchema,UserRegistrationResponseSchema,PasswordResetConfirmSchema,PasswordResetRequestSchema
from .service.service_auth import register_user,authenticate_user,create_session,delete_session
from DataBase.database import SessionDep
from .dependencies import get_current_user
from DataBase.models import Users
from .service.service_email_verification import confirm_email,request_email_verification
from .service.service_password_reset import request_password_reset
from .service.service_password_reset import reset_password
from .service.service_users import update_current_user
from config import COOKIE_SECURE

auth_router = APIRouter(prefix='/auth', tags=['Auth'])

@auth_router.post('/register', response_model=UserRegistrationResponseSchema, summary='Register an account',status_code=201)
def register_new_user(session:SessionDep, user_data:UserCreateSchema):
    user=register_user(session=session,user_data=user_data)

    try:
        request_email_verification(session, user)
        verification_email_sent=True
    except HTTPException as error:
        if error.status_code==503:
            verification_email_sent = False
        else:
            raise
    user_response=UserRegistrationResponseSchema(**UserResponseSchema.model_validate(user).model_dump(),verification_email_sent=verification_email_sent)
    return user_response


@auth_router.post('/login', response_model=UserResponseSchema, summary='Sign in and create a session')
def login(session:SessionDep, user_data:UserLoginSchema, response:Response):
    user = authenticate_user(session=session,user_data=user_data)

    token,expires_at=create_session(session=session,user_id=user.id)
    response.set_cookie(
        key="deathline_session",
        value=token,
        expires=expires_at,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/"
    )
    return user

@auth_router.get('/me', response_model=UserResponseSchema,summary='Get your profile')
def find_me_by_token(user: Users = Depends(get_current_user)):
    return user
@auth_router.patch('/me',response_model=UserResponseSchema,summary='Update your profile')
def update_user(session:SessionDep,user_data:UserUpdateSchema,user: Users = Depends(get_current_user)):
    return update_current_user(session, user, user_data)



@auth_router.post('/logout', summary='Sign out and end the current session', status_code=204)
def logout(session:SessionDep, response:Response,request: Request):
    token=request.cookies.get("deathline_session")
    delete_session(session=session,token=token)
    response.delete_cookie(key="deathline_session",path="/",httponly=True,samesite="lax",secure=COOKIE_SECURE)
    return


@auth_router.post('/verify-email',response_model=UserResponseSchema, summary='Verify your email using the emailed token')
def email_confirm(session:SessionDep, data:EmailVerificationConfirmSchema):
    user=confirm_email(session,data.token)
    return user

@auth_router.post('/resend-verification',status_code=204, summary='Resend the email verification link')
def resend_verification(session:SessionDep,user:Users=Depends(get_current_user)):
    request_email_verification(session, user)

@auth_router.post('/forgot-password', summary='Request a password reset email')
def forgot_password(session:SessionDep,data:PasswordResetRequestSchema):
    request_password_reset(session,data.email)
    message='If an account with this email exists, we have sent a password reset link.'
    return {"detail": message}

@auth_router.post('/reset-password',status_code=204, summary='Set a new password using a token and end all sessions')
def res_password(session:SessionDep,data:PasswordResetConfirmSchema):
    reset_password(session,data.token,data.new_password)

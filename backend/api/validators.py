def validate_password(value):
    has_upper = False
    has_special = False

    for char in value:
        if char.isupper():
            has_upper=True
        if (not char.isalnum()) and (not char.isspace()):
            has_special=True
    if has_upper==True and has_special==True:
        return value
    else:
        raise ValueError("Add at least one uppercase letter and one special character")

export interface BootstrapSetupRequestDto {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface BootstrapSetupResponseDto {
  status: "SUCCESS";
  message: string;
  adminUserId: string;
  initializedAt: string;
}


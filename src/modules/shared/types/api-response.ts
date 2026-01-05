export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const ok = <T>(data: T, message = 'success'): ApiResponse<T> => ({
  code: 200,
  message,
  data,
});



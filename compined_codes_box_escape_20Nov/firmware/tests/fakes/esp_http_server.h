#pragma once
#include "Arduino.h"
#include "freertos/FreeRTOS.h"
#include <map>
#include <cstddef>
constexpr int ESP_OK=0, ESP_FAIL=-1, HTTP_GET=0, HTTP_POST=1;
constexpr int HTTPD_RESP_USE_STRLEN=-1;
struct httpd_config_t{std::size_t stack_size=4096;unsigned short server_port=80; int max_open_sockets=7, recv_wait_timeout=5,send_wait_timeout=5;bool lru_purge_enable=false;};
using httpd_method_t=int;
#define HTTPD_DEFAULT_CONFIG() httpd_config_t{}
struct httpd_req_t{std::string query;std::map<std::string,std::string> requestHeaders;bool chunkEnd=false;std::string type, body, status="200 OK";std::map<std::string,std::string> headers;};
struct httpd_uri_t{const char* uri;int method; esp_err_t(*handler)(httpd_req_t*);void* user_ctx;};
namespace fakehttp{inline std::map<std::string,httpd_uri_t> routes; inline unsigned port=0;}
using httpd_handle_t=void*;
inline esp_err_t httpd_start(httpd_handle_t* s,const httpd_config_t* c){fakehttp::port=c->server_port;*s=&fakehttp::routes;return ESP_OK;}
inline esp_err_t httpd_stop(httpd_handle_t){fakehttp::routes.clear();return ESP_OK;}
inline esp_err_t httpd_register_uri_handler(httpd_handle_t,const httpd_uri_t* route){fakehttp::routes[route->uri]=*route;return ESP_OK;}
inline esp_err_t httpd_resp_set_type(httpd_req_t* r,const char* v){r->type=v;return ESP_OK;}
inline esp_err_t httpd_resp_set_status(httpd_req_t* r,const char* v){r->status=v;return ESP_OK;}
inline esp_err_t httpd_resp_set_hdr(httpd_req_t* r,const char* k,const char* v){r->headers[k]=v;return ESP_OK;}
inline esp_err_t httpd_resp_send(httpd_req_t* r,const char* b,std::ptrdiff_t n){r->body.assign(b,n<0?strlen(b):n);return ESP_OK;}
inline esp_err_t httpd_resp_sendstr(httpd_req_t* r,const char* b){return httpd_resp_send(r,b,-1);}
inline esp_err_t httpd_resp_send_chunk(httpd_req_t* r,const char* data,std::ptrdiff_t n){
  if(r->chunkEnd)return ESP_FAIL;
  if(n==0){r->chunkEnd=true;return ESP_OK;}
  if(!data)return ESP_FAIL;
  r->body.append(data,n<0?strlen(data):static_cast<size_t>(n));return ESP_OK;
}

inline esp_err_t fake_copy(const std::string& v,char* out,size_t size){
  if(!out || size<=v.size())return ESP_FAIL;
  memcpy(out,v.c_str(),v.size()+1);return ESP_OK;
}
inline esp_err_t httpd_req_get_hdr_value_str(httpd_req_t* r,const char* name,char* target,size_t size){
  const auto v=r->requestHeaders.find(name);
  return v==r->requestHeaders.end()?ESP_FAIL:fake_copy(v->second,target,size);
}
inline size_t httpd_req_get_url_query_len(httpd_req_t* r){return r->query.size();}
inline esp_err_t httpd_req_get_url_query_str(httpd_req_t* r,char* out,size_t size){
  return r->query.empty()?ESP_FAIL:fake_copy(r->query,out,size);
}

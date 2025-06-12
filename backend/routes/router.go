package routes

import "github.com/gorilla/mux"

func InitRoutes() *mux.Router {
	r := mux.NewRouter()

	AuthRoutes(r)
	RegisterUserRoutes(r)
	// Add more like RegisterPostRoutes(r), etc.

	return r
}

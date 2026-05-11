import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const CreateCounsellorPage = () => {
	const navigate = useNavigate();

	useEffect(() => {
		navigate("/users/create");
	}, [navigate]);

	return null;
};
